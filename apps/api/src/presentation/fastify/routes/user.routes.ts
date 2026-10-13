import type { AwilixContainer } from "awilix";
import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";

import type { CompositionRootContract } from "../../../container/composition-root.contract.js";
import { ErrorResponseValidator } from "../../shared/validators/error-response.validator.js";
import { CreateUserRequestValidator } from "../../shared/validators/user/create-user-request.validator.js";
import { CreateUserResponseValidator } from "../../shared/validators/user/create-user-response.validator.js";
import { LoginRequestValidator } from "../../shared/validators/user/login-request.validator.js";
import { LoginResponseValidator } from "../../shared/validators/user/login-response.validator.js";
import { VerifyEmailRequestValidator } from "../../shared/validators/user/verify-email-request.validator.js";
import { VerifyEmailResponseValidator } from "../../shared/validators/user/verify-email-response.validator.js";
import { UserController } from "../controllers/user.controller.js";

export function userRoutes(app: FastifyInstance, opts: { rootContainer: AwilixContainer<CompositionRootContract> }) {
  const userController = new UserController(opts.rootContainer.cradle.commandBus);

  app.withTypeProvider<ZodTypeProvider>().post(
    "/api/v1/users",
    {
      schema: {
        tags: ["Users (Registration -> Verification)"],
        summary: "Create a new user",
        description: "Registers a new user inside the identity bounded context.",
        operationId: "createUser",
        body: CreateUserRequestValidator,
        response: {
          201: CreateUserResponseValidator,
          400: ErrorResponseValidator,
          409: ErrorResponseValidator,
          422: ErrorResponseValidator,
        },
      },
      config: {
        rateLimit: { max: 20, timeWindow: "1 minute" },
      },
    },
    userController.createUser,
  );

  app.withTypeProvider<ZodTypeProvider>().post(
    "/api/v1/users/verify-email",
    {
      schema: {
        tags: ["Users (Registration -> Verification)"],
        summary: "Verify user email",
        description: "Verifies user's email address.",
        operationId: "verifyEmail",
        body: VerifyEmailRequestValidator,
        response: {
          201: VerifyEmailResponseValidator,
          400: ErrorResponseValidator,
          409: ErrorResponseValidator,
          422: ErrorResponseValidator,
        },
      },
      config: {
        rateLimit: { max: 5, timeWindow: "1 minute" },
      },
    },
    userController.verifyEmail,
  );

    app.withTypeProvider<ZodTypeProvider>().post(
        "/api/v1/auth/login",
        {
            schema: {
                tags: ["Users (Registration -> Verification -> Login)"],
                summary: "Authenticate user",
                description: "Authenticates a user via credentials and issues secure HttpOnly session cookies.",
                operationId: "login",
                body: LoginRequestValidator,
                response: {
                    200: LoginResponseValidator,
                    400: ErrorResponseValidator,
                    401: ErrorResponseValidator,
                    422: ErrorResponseValidator,
                },
            },
            config: {
                rateLimit: { max: 5, timeWindow: "1 minute" },
            },
        },
        userController.login,
    );



}
