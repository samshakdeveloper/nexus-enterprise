import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import fp from "fastify-plugin";

/**
 * Minimal bearer-token auth placeholder — the CreateUser endpoint is
 * intentionally public (you cannot authenticate as a user before it
 * exists), but this decorator demonstrates where an `authenticate`
 * pre-handler would hang for every OTHER endpoint in the system, matching
 * the "Authentication / Authorization" slice of the architecture diagram.
 */
export const authPlugin = fp((app: FastifyInstance) => {
  app.decorate("authenticate", async (request: FastifyRequest, reply: FastifyReply) => {
    const header = request.headers.authorization;
    if (!header?.startsWith("Bearer ")) {
      reply.status(401).send({ error: { code: "UNAUTHENTICATED", message: "Missing bearer token" } });
      return;
    }
    // Real implementation: verify JWT signature/expiry against JWT_SECRET and attach the principal to the request.
  });
});

declare module "fastify" {
  interface FastifyInstance {
    authenticate(request: FastifyRequest, reply: FastifyReply): Promise<void>;
  }
}
