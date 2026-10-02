import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import OpenAPIHandler from "@graphql-mesh/openapi";
import { InMemoryStoreStorageAdapter, MeshStore } from "@graphql-mesh/store";
import type { KeyValueCache, Logger } from "@graphql-mesh/types";
import { PubSub } from "@graphql-mesh/utils";
import type { FastifyInstance } from "fastify";
import fp from "fastify-plugin";
import mercurius from "mercurius";

export const graphqlMeshPlugin = fp(
  async (app: FastifyInstance) => {
    await app.register(mercurius, {
      schema: `type Query { _health: String }`,
      path: "/graphql",
      graphiql: false,
      context: (request) => ({ headers: request.headers }),
    });

    app.addHook("onReady", async () => {
      try {
        const rawSwagger = (app as FastifyInstance & { swagger?: () => unknown }).swagger?.();

        if (!rawSwagger) {
          return;
        }

        const openapiSpec = JSON.parse(JSON.stringify(rawSwagger)) as {
          paths?: Record<string, Record<string, { responses?: Record<string, unknown> }>>;
        };

        // فقط responseهای موفق (2xx) برای GraphQL
        for (const pathItem of Object.values(openapiSpec.paths ?? {})) {
          for (const operation of Object.values(pathItem)) {
            if (!operation.responses) continue;
            for (const status of Object.keys(operation.responses)) {
              if (!/^2\d\d$/.test(status)) {
                delete operation.responses[status];
              }
            }
          }
        }
        const dummyStore = new MeshStore("NexusApiStore", new InMemoryStoreStorageAdapter(), {
          readonly: false,
          validate: false,
        });

        const tmpSpecPath = path.join(os.tmpdir(), "temp-openapi.json");
        fs.writeFileSync(tmpSpecPath, JSON.stringify(openapiSpec, null, 2));

        const customLogger: Logger = {
          debug: (...args: unknown[]) => {
            app.log.debug({ args }, "🐛 [MESH DEBUG]");
          },
          info: (...args: unknown[]) => {
            app.log.info({ args }, "ℹ️ [MESH INFO]");
          },
          warn: (...args: unknown[]) => {
            app.log.warn({ args }, "⚠️ [MESH WARN]");
          },
          error: (...args: unknown[]) => {
            app.log.error({ args }, "❌ [MESH ERROR]");
          },
          log: (...args: unknown[]) => {
            app.log.info({ args }, "ℹ [MESH LOG]");
          },
          child: () => customLogger,
        };

        // 🟢 پیاده‌سازی تایپ-سیف KeyValueCache برای تامین شرط cache
        const dummyCache: KeyValueCache = {
          get: () => undefined,
          set: () => {},
          delete: (_key: string) => true,
          getKeysByPrefix: (_prefix: string) => [],
        };

        // 🟢 ایجاد PubSub جهت تامین شرط pubsub
        const pubsub = new PubSub();

        const handler = new OpenAPIHandler({
          name: "NexusApi",
          store: dummyStore,
          cache: dummyCache,
          pubsub,
          config: {
            source: tmpSpecPath,
            endpoint: process.env["API_PUBLIC_URL"] ?? "http://localhost:3000",
          },
          baseDir: process.cwd(),
          importFn: <T>(m: string) => import(m) as Promise<T>,
          logger: customLogger,
        });

        const meshSource = await handler.getMeshSource({
          fetchFn: globalThis.fetch,
        });

        const schema = meshSource?.schema;

        if (!schema) {
          return;
        }

        if (app.graphql) {
          app.graphql.replaceSchema(schema);
        }
      } catch (err: unknown) {
        app.log.error({ err }, "❌ [CRITICAL EXCEPTION] Error during Mesh init");
      }
    });
  },
  { name: "graphql-mesh-plugin" },
);
