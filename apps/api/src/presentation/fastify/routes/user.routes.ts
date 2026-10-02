import type { AwilixContainer } from "awilix";
import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";

import type { CompositionRootContract } from "../../../container/composition-root.contract.js";
import { ErrorResponseValidator } from "../../shared/validators/error-response.validator.js";
import { CreateUserRequestValidator } from "../../shared/validators/user/create-user-request.validator.js";
import { CreateUserResponseValidator } from "../../shared/validators/user/create-user-response.validator.js";
import { UserController } from "../controllers/user.controller.js";

export function userRoutes(app: FastifyInstance, opts: { rootContainer: AwilixContainer<CompositionRootContract> }) {
  const userController = new UserController(opts.rootContainer.cradle.commandBus);

  app.withTypeProvider<ZodTypeProvider>().post(
    "/api/v1/users",
    {
      schema: {
        tags: ["Users"],
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
}
