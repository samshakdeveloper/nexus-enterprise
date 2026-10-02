import { EmailAlreadyInUseError, PasswordPolicyError } from "@nexus/application";
import { DomainException } from "@nexus/domain";
import type { LoggerPort } from "@nexus/shared";
import type { FastifyInstance, FastifyError, FastifyRequest, FastifyReply } from "fastify";
import { ZodError } from "zod";

interface ErrorBody {
  error: {
    code: string;
    message: string;
    correlationId: string;
    details?: unknown;
  };
}

/**
 * Single choke point translating every kind of failure (validation,
 * domain, application, unexpected) into a consistent HTTP problem shape.
 * Domain/application exceptions never leak stack traces or internal
 * details to the client — only their `code` and `message`, which are
 * designed to be safe to show.
 */
export function registerErrorHandler(app: FastifyInstance, logger: LoggerPort): void {
  app.setErrorHandler((error: FastifyError | Error, request: FastifyRequest, reply: FastifyReply) => {
    const correlationId = request.correlationId ?? "unknown";
    const body: ErrorBody = {
      error: { code: "INTERNAL_ERROR", message: "An unexpected error occurred.", correlationId },
    };
    let statusCode = 500;

    if (error instanceof ZodError) {
      statusCode = 400;
      body.error = {
        code: "VALIDATION_ERROR",
        message: "Request failed validation.",
        correlationId,
        details: error.flatten(),
      };
    } else if (error instanceof EmailAlreadyInUseError) {
      statusCode = 409;
      body.error = { code: error.code, message: error.message, correlationId };
    } else if (error instanceof PasswordPolicyError) {
      statusCode = 422;
      body.error = { code: error.code, message: error.message, correlationId };
    } else if (error instanceof DomainException) {
      statusCode = 422;
      body.error = { code: error.code, message: error.message, correlationId };
    }  else if ((error as FastifyError).validation) {
    // خطای ولیدیشن Fastify (schema/zod) که داخل FastifyError پیچیده شده
    statusCode = 400;
    body.error = {
      code: "VALIDATION_ERROR",
      message: "Request failed validation.",
      correlationId,
      details: (error as FastifyError).validation,
    };
  } else if ("statusCode" in error && typeof error.statusCode === "number") {
    statusCode = error.statusCode;
    body.error = { code: "REQUEST_ERROR", message: error.message, correlationId };
  } if (statusCode >= 500) {
      logger.error("Unhandled error", error, { correlationId, url: request.url });
    } else {
      logger.warn("Request failed", { correlationId, url: request.url, statusCode, message: error.message });
    }

    reply.status(statusCode).send(body);
  });

  app.setNotFoundHandler((request, reply) => {
    reply.status(404).send({
      error: {
        code: "NOT_FOUND",
        message: `Route ${request.method} ${request.url} not found.`,
        correlationId: request.correlationId,
      },
    });
  });
}
