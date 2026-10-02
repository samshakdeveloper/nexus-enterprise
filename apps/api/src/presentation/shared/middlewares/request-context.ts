import { AsyncLocalStorage } from "node:async_hooks";

export interface RequestContext {
  correlationId: string;
  traceId?: string | undefined;
  startedAt: number;
}

/**
 * AsyncLocalStorage-backed request context: makes the correlation/trace id
 * available to any code running within a request's async call chain
 * (handlers, repositories, loggers) WITHOUT threading it through every
 * function signature. Fastify's own `request` object also carries it for
 * anything that has direct access to `request`.
 */
export const requestContextStorage = new AsyncLocalStorage<RequestContext>();

export function getRequestContext(): RequestContext | undefined {
  return requestContextStorage.getStore();
}
