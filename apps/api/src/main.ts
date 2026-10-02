import { loadEnv } from "./config/env.js";
import { initializeCompositionRoot } from "./container/composition-root.js";
import { FastifyRequestPipelineAdapter } from "./presentation/fastify/fastify-request-pipeline.adapter.js";
import { configureRequestPipeline } from "./request-pipeline.js";
/**
 * Bootstraps the application runtime by initializing core dependencies
 * and starting the HTTP request handling pipeline.
 */

async function bootstrap() {
  const env = loadEnv();
  const rootContainer = initializeCompositionRoot(env);

  //fastifyAdapter
  const fastifyAdapter = new FastifyRequestPipelineAdapter();
  const requestPipeline = await configureRequestPipeline(rootContainer, fastifyAdapter);

  try {
    await requestPipeline.listen({ port: env.PORT, host: "0.0.0.0" });
    rootContainer.cradle.loggerPort.info(`nexus-api listening on port ${env.PORT}`, { env: env.NODE_ENV });
  } catch (error) {
    rootContainer.cradle.loggerPort.error("Failed to start server", error);
    process.exit(1);
  }

  const shutdown = async (signal: string) => {
    rootContainer.cradle.loggerPort.info(`Received ${signal}, shutting down gracefully`);
    await requestPipeline.close();
    await rootContainer.dispose();
    process.exit(0);
  };
  process.on("SIGTERM", () => void shutdown("SIGTERM"));
  process.on("SIGINT", () => void shutdown("SIGINT"));
}

void bootstrap();
