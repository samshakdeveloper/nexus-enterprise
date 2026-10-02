import { randomUUID } from "node:crypto";

import { trace } from "@opentelemetry/api";
import type { FastifyInstance } from "fastify";
import fp from "fastify-plugin";

import { requestContextStorage } from "../../shared/middlewares/request-context.js";

const HEADER = "x-correlation-id";

/**
 * First middleware in the chain (registered first in main.ts): assigns or
 * propagates a correlation id, opens the AsyncLocalStorage scope for the
 * rest of the request lifecycle, and echoes the id back on the response so
 * clients can correlate their own logs with ours.
 */
export const correlationIdPlugin = fp((app: FastifyInstance) => {
  app.addHook("onRequest", (request, reply, done) => {
    const correlationId = (request.headers[HEADER] as string | undefined) ?? randomUUID();
    const activeSpan = trace.getActiveSpan();
    const traceId = activeSpan?.spanContext().traceId;

    reply.header(HEADER, correlationId);
    requestContextStorage.run({ correlationId, traceId, startedAt: Date.now() }, () => {
      request.correlationId = correlationId;
      done();
    });
  });
});

declare module "fastify" {
  interface FastifyRequest {
    correlationId: string;
  }
}
