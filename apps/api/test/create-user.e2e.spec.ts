import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { asValue, asFunction, type AwilixContainer } from "awilix";
import type { FastifyInstance } from "fastify";
import {
  CreateUserHandler,
  DefaultPasswordPolicyService,
  type UserRepositoryPort,
  type PasswordHasherPort,
  type EventPublisherPort,
  type UnitOfWorkPort,
} from "@nexus/application";
import { InMemoryCommandBus } from "@nexus/infrastructure";
import type { User, UserId, Email } from "@nexus/domain";
import { initializeCompositionRoot, type CompositionRootContract } from "../src/container/composition-root";

import { FastifyRequestPipelineAdapter } from "../src/presentation/fastify/fastify-request-pipeline.adapter.js";
import { configureRequestPipeline } from "../src/request-pipeline.js";
import { loadEnv } from "../src/config/env";
import { UserController } from "../src/presentation/fastify/controllers/user.controller";

class FakeUserRepository implements UserRepositoryPort {
  public readonly byEmail = new Map<string, User>();
  async findByEmail(email: Email) {
    return this.byEmail.get(email.value) ?? null;
  }
  async existsByEmail(email: Email) {
    return this.byEmail.has(email.value);
  }
  async save(user: User) {
    this.byEmail.set(user.email.value, user);
  }
  async findById(_id: UserId) {
    return null;
  }
}

const fakeHasher: PasswordHasherPort = { hash: async (p) => `hashed:${p}______________`, verify: async () => true };
const fakePublisher: EventPublisherPort = { publish: async () => {} };
const passthroughUow: UnitOfWorkPort = { withTransaction: async (work) => work(undefined) };
const fakeVerificationCodeGenerator = { generate: () => "123456" };

describe("POST /api/v1/users (e2e)", () => {
  let app: FastifyInstance;
  let container: AwilixContainer<CompositionRootContract> | undefined;
  let fakeRepo: FakeUserRepository;

  beforeAll(async () => {
    // 1. متغیرهای محیطی را قبل از loadEnv تنظیم می‌کنیم تا اسکیمای Zod پاس شود
    process.env.DATABASE_URL ??= "postgres://fake:fake@localhost:5432/fake";
    process.env.JWT_SECRET ??= "test-secret-must-be-at-least-32-chars-long!!";
    process.env.ENCRYPTION_SECRET_KEY ??= "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
    process.env.NODE_ENV ??= "test";

    const env = loadEnv();
    container = initializeCompositionRoot(env);

    fakeRepo = new FakeUserRepository();
    container.register({
      userRepositoryPort: asValue(fakeRepo),
      passwordHasherPort: asValue(fakeHasher),
      eventPublisherPort: asValue(fakePublisher),
      unitOfWorkPort: asValue(passthroughUow),
      passwordPolicyPort: asValue(new DefaultPasswordPolicyService()),
      verificationCodeGeneratorPort: asValue(fakeVerificationCodeGenerator),
    });

    container.register({
      createUserHandler: asFunction(
        ({
          userRepositoryPort,
          passwordHasherPort,
          passwordPolicyPort,
          eventPublisherPort,
          unitOfWorkPort,
          idGeneratorPort,
          clockPort,
          loggerPort,
          verificationCodeGeneratorPort,
        }: CompositionRootContract) =>
          new CreateUserHandler({
            userRepositoryPort,
            passwordHasherPort,
            passwordPolicyPort,
            eventPublisherPort,
            unitOfWorkPort,
            idGeneratorPort,
            clockPort,
            loggerPort,
            verificationCodeGeneratorPort,
          }),
      ).singleton(),
    });

    const bus = new InMemoryCommandBus();
    bus.register("CreateUserCommand", container.cradle.createUserHandler);

    (container as unknown as AwilixContainer<Record<string, unknown>>).register({
      commandBus: asValue(bus),
      userController: asFunction(({ commandBus: b }: CompositionRootContract) => new UserController(b)).singleton(),
    });

    const fastifyAdapter = new FastifyRequestPipelineAdapter();
    await configureRequestPipeline(container, fastifyAdapter);

    // نمونه‌ی واقعی Fastify را مستقیم از getter صریح آداپتر می‌گیریم (بدون حدس زدن نام پراپرتی).
    // اگر getter وجود نداشته باشد، TypeScript و تست همین‌جا خطا می‌دهند، نه ۵ خطای گیج‌کننده بعدتر.
    app = fastifyAdapter.instance;
    await app.ready();
  });

  afterAll(async () => {
    await app?.close();
    await container?.dispose();
  });

  it("returns 201 with the created user on valid input", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/api/v1/users",
      payload: { email: "grace@example.com", fullName: "Grace Hopper", password: "Str0ngPass!" },
    });

    expect(response.statusCode).toBe(201);
    const body = response.json();
    expect(body.email).toBe("grace@example.com");
    expect(body.status).toBe("PENDING_VERIFICATION");
    expect(response.headers["x-correlation-id"]).toBeDefined();
  });

  it("returns 409 when the email is already registered", async () => {
    await app.inject({
      method: "POST",
      url: "/api/v1/users",
      payload: { email: "dup@example.com", fullName: "Dup User", password: "Str0ngPass!" },
    });
    const response = await app.inject({
      method: "POST",
      url: "/api/v1/users",
      payload: { email: "dup@example.com", fullName: "Dup User Two", password: "Str0ngPass!" },
    });

    expect(response.statusCode).toBe(409);
    expect(response.json().error.code).toBe("USER.EMAIL_ALREADY_IN_USE");
  });

  it("returns 400 on malformed input", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/api/v1/users",
      payload: { email: "not-an-email", fullName: "X", password: "short" },
    });
    expect(response.statusCode).toBe(400);
    expect(response.json().error.code).toBe("VALIDATION_ERROR");
  });

  it("returns 422 when the password fails policy", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/api/v1/users",
      payload: { email: "weakpw@example.com", fullName: "Weak Pw", password: "alllowercase1" },
    });
    expect(response.statusCode).toBe(422);
    expect(response.json().error.code).toBe("USER.PASSWORD_POLICY_VIOLATION");
  });

  it("replays the cached response for a repeated Idempotency-Key", async () => {
    const headers = { "idempotency-key": "fixed-key-123" };
    const payload = { email: "idem@example.com", fullName: "Idem User", password: "Str0ngPass!" };

    const first = await app.inject({ method: "POST", url: "/api/v1/users", payload, headers });
    const second = await app.inject({ method: "POST", url: "/api/v1/users", payload, headers });

    expect(first.statusCode).toBe(201);
    expect(second.statusCode).toBe(201);
    expect(second.headers["x-idempotent-replay"]).toBe("true");
    expect(second.json()).toEqual(first.json());
  });
});
