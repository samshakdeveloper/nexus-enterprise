import type { FastifyInstance } from "fastify";

export function healthRoutes(app: FastifyInstance) {
  app.get("/health/live", () => ({ status: "ok" }));
  app.get("/health/ready", () => ({ status: "ok" }));
}
