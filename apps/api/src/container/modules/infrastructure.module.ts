import {
  PostgresInstanceAdapter,
  PostgresUserRepositoryAdapter,
  PostgresUnitOfWorkAdapter,
  OutboxEventPublisherAdapter,
  BcryptPasswordHasherAdapter,
  UuidIdGeneratorAdapter,
  SystemClockAdapter,
  PinoLoggerAdapter,
  AesEncryptionAdapter,
  TracedCommandBusAdapter,
  InMemoryCommandBus,
  AwsSecretsManagerAdapter,
  CryptoVerificationCodeGeneratorAdapter,
} from "@nexus/infrastructure";
import { asClass, asValue, asFunction, type AwilixContainer } from "awilix";

import type { Env } from "../../config/env.js";
import type { CompositionRootContract } from "../composition-root.contract.js";

export function registerInfrastructureModule(container: AwilixContainer<CompositionRootContract>, env: Env): void {
  const isLocalK8s = env.NODE_ENV === "development";
  const localStackEndpoint = env.LOCALSTACK_ENDPOINT;
  const secretKey = env.ENCRYPTION_SECRET_KEY;
  container.register({
    db: asValue(PostgresInstanceAdapter.createInstance(env.DATABASE_URL)),
    loggerPort: asValue(PinoLoggerAdapter.create(env.LOG_LEVEL)),
    clockPort: asClass(SystemClockAdapter).singleton(),
    idGeneratorPort: asClass(UuidIdGeneratorAdapter).singleton(),

    passwordHasherPort: asClass(BcryptPasswordHasherAdapter).singleton(),
    verificationCodeGeneratorPort: asClass(CryptoVerificationCodeGeneratorAdapter).singleton(),
    unitOfWorkPort: asClass(PostgresUnitOfWorkAdapter).classic().singleton(),
    userRepositoryPort: asClass(PostgresUserRepositoryAdapter).classic().singleton(),
    eventPublisherPort: asClass(OutboxEventPublisherAdapter).classic().singleton(),

    secretManagerPort: asClass(AwsSecretsManagerAdapter)
      .inject(() => ({
        region: env.AWS_REGION || "us-east-1",
        endpoint: isLocalK8s ? localStackEndpoint : undefined,
      }))
      .singleton(),

    encryptionPort: asFunction(() => new AesEncryptionAdapter(secretKey)).singleton(),
    commandBus: asFunction(({ loggerPort }: CompositionRootContract) => {
      const bus = new InMemoryCommandBus();
      return new TracedCommandBusAdapter(bus, loggerPort, env.TRACING_LEVEL);
    }).singleton(),
  });
}
