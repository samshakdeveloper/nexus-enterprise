import type { LoggerPort } from "@nexus/shared";
import type { FastifyInstance } from "fastify";
import fp from "fastify-plugin";

export const requestLoggingPlugin = fp((app: FastifyInstance, opts: { logger: LoggerPort }) => {
  app.addHook("onResponse", (request, reply, done) => {
    opts.logger.info("request completed", {
      method: request.method,
      url: request.url,
      statusCode: reply.statusCode,
      correlationId: request.correlationId,
      durationMs: reply.elapsedTime,
    });
    done();
  });
});
