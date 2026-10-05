import { log } from "node:console";

import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import rateLimit from "@fastify/rate-limit";
import underPressure from "@fastify/under-pressure";
import type { AwilixContainer } from "awilix";
import Fastify, { type FastifyInstance } from "fastify";
import fastifyMetrics from "fastify-metrics";
import { serializerCompiler, validatorCompiler } from "fastify-type-provider-zod";

import type { CompositionRootContract } from "../../container/composition-root.contract.js";
import type { RequestPipelineServerPort } from "../../request-pipeline.port.js";
import { registerErrorHandler } from "./error-handling/error-handler.js";
import { authPlugin } from "./middlewares/auth.plugin.js";
import { correlationIdPlugin } from "./middlewares/correlation-id.plugin.js";
import { idempotencyPlugin } from "./middlewares/idempotency.plugin.js";
import { requestLoggingPlugin } from "./middlewares/request-logging.plugin.js";
import { graphqlMeshPlugin } from "./plugins/graphql-mesh.plugin.js";
import { swaggerPlugin } from "./plugins/swagger.plugin.js";
import { healthRoutes } from "./routes/health.routes.js";
import { userRoutes } from "./routes/user.routes.js";

export class FastifyRequestPipelineAdapter implements RequestPipelineServerPort {
  private fastifyApp!: FastifyInstance;

  get instance(): FastifyInstance {
    if (!this.fastifyApp) {
      throw new Error("FastifyRequestPipelineAdapter: setup() must be called before accessing instance");
    }
    return this.fastifyApp;
  }

  async setup(rootContainer: AwilixContainer<CompositionRootContract>): Promise<void> {
    const env = rootContainer.cradle.env;
    log("fastifyApp  run");
    this.fastifyApp = Fastify({
      pluginTimeout: 30000,
      logger: { level: "info" }, // ✅ بدون pino-loki
      trustProxy: true,
    });

    log("underPressure  plugin");
    await this.fastifyApp.register(underPressure, {
      maxEventLoopDelay: 2000, // افزایش به ۲ ثانیه
      maxHeapUsedBytes: 1.5 * 1024 * 1024 * 1024, // 1.5 گیگابایت
      maxRssBytes: 1.5 * 1024 * 1024 * 1024, // 1.5 گیگابایت
      exposeStatusRoute: false,
    });

    log("correlationIdPlugin  plugin");
    await this.fastifyApp.register(correlationIdPlugin);
    const isDev = env.NODE_ENV === "development";
    log("NODE_ENVNODE_ENV :" + env.NODE_ENV);
    log("helmet  plugin");
    if (!isDev) {
      await this.fastifyApp.register(helmet, {
        contentSecurityPolicy: true,
      });
    }

    log("cors  plugin");
    await this.fastifyApp.register(cors, {
      // ۱. اجازه دادن به مرورگر برای خواندن هدرهای سفارشی پاسخ
      exposedHeaders: ["x-idempotent-replay"],

      // ۲. اجازه دادن به هدرهای ورودی سفارشی (اختیاری ولی برای صراحت عالیه)
      allowedHeaders: ["Content-Type", "Authorization", "idempotency-key"],

      // ۳. کنترل دامنه‌های مجاز (بهتره توی تولید از متغیر محیطی خونده بشه)
      origin: env.NODE_ENV === "production" ? env.CORS_ALLOWED_ORIGINS : true,

      credentials: true,
    });

    log("fastifyMetrics  plugin");
    await this.fastifyApp.register(fastifyMetrics.default || fastifyMetrics, { endpoint: "/metrics" });

    log("rateLimit  plugin");
    await this.fastifyApp.register(rateLimit, { max: env.RATE_LIMIT_MAX, timeWindow: env.RATE_LIMIT_WINDOW_MS });

    log("authPlugin  plugin");
    await this.fastifyApp.register(authPlugin);

    log("idempotencyPlugin  plugin");
    await this.fastifyApp.register(idempotencyPlugin);

    log("requestLoggingPlugin  plugin");
    await this.fastifyApp.register(requestLoggingPlugin, { logger: rootContainer.cradle.loggerPort });

    log("setValidatorCompiler  plugin");
    // ولیدیتور: قبلاً داشتید، درست بود
    type ValidatorOpts = Parameters<typeof validatorCompiler>[0];
    type SerializerOpts = Parameters<typeof serializerCompiler>[0];

    const hasSafeParse = (schema: unknown): boolean =>
      typeof schema === "object" &&
      schema !== null &&
      typeof (schema as { safeParse?: unknown }).safeParse === "function";

    this.fastifyApp.setValidatorCompiler((opts: ValidatorOpts) => {
      if (opts.url?.startsWith("/graphql") || !hasSafeParse(opts.schema)) {
        return (data: unknown) => ({ value: data });
      }
      return validatorCompiler(opts);
    });

    log("setSerializerCompiler plugin");

    // سریالایزر: برای رفع باگ ۵۰۰
    this.fastifyApp.setSerializerCompiler((opts: SerializerOpts) => {
      if (!hasSafeParse(opts.schema)) {
        return (data: unknown) => JSON.stringify(data);
      }
      return serializerCompiler(opts);
    });

    log("swaggerPlugin  plugin");
    await this.fastifyApp.register(swaggerPlugin);

    registerErrorHandler(this.fastifyApp, rootContainer.cradle.loggerPort);
    this.fastifyApp.addHook("onRoute", (route) => {
      if (!route.url.startsWith("/api/")) return;

      const schema = route.schema as { operationId?: string; hide?: boolean } | undefined;
      if (schema?.hide) return;

      if (!schema?.operationId) {
        throw new Error(`operationId is required: ${String(route.method)} ${route.url}`);
      }
    });
    log("healthRoutes  plugin");
    await this.fastifyApp.register(async (instance) => {
      await instance.register(healthRoutes);
      await instance.register(userRoutes, { rootContainer });
    });

    log("graphqlMeshPlugin  plugin");
    await this.fastifyApp.register(graphqlMeshPlugin);
  }

  async listen(options: { port: number; host: string }): Promise<void> {
    await this.fastifyApp.listen(options);
  }

  async close(): Promise<void> {
    await this.fastifyApp.close();
  }
}
