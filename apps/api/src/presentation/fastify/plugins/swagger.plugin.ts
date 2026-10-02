import swagger from "@fastify/swagger";
import swaggerUi from "@fastify/swagger-ui";
import type { FastifyInstance } from "fastify";
import fp from "fastify-plugin";
import { jsonSchemaTransform } from "fastify-type-provider-zod";

export const swaggerPlugin = fp(async (app: FastifyInstance) => {
  // تنظیم کامپایلرها برای پشتیبانی اتوماتیک از Zod

  // ثبت Swagger Core (تولید مشخصات OpenAPI)
  await app.register(swagger, {
    openapi: {
      info: {
        title: "Nexus Enterprise API",
        description: "Enterprise Architecture Reference API with CQRS & DDD",
        version: "1.0.0",
      },
      servers: [{ url: "http://localhost:3000", description: "Local Environment" }],
      components: {
        securitySchemes: {
          bearerAuth: {
            type: "http",
            scheme: "bearer",
            bearerFormat: "JWT",
          },
        },
      },
    },
    transform: (opts) => {
      // اگر آدرس روت مربوط به graphql است، آن را از Swagger خروجی حذف کن تا ۵۰۰ ندهد
      if (opts.url.startsWith("/graphql")) {
        return { schema: { hide: true }, url: opts.url };
      }
      return jsonSchemaTransform(opts);
    },
  });

  // ثبت رابط کاربری Swagger UI
  await app.register(swaggerUi, {
    routePrefix: "/docs",
    uiConfig: {
      docExpansion: "list",
      deepLinking: true,
    },
  });
});
