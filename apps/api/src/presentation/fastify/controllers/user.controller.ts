import type { CommandBus, CreateUserResponseContract } from "@nexus/application";
import { CreateUserCommand } from "@nexus/application";
import type { FastifyRequest, FastifyReply } from "fastify";

import { CreateUserRequestValidator } from "../../shared/validators/user/create-user-request.validator.js";

export class UserController {
  constructor(private readonly commandBus: CommandBus) {}

  public createUser = async (
    request: FastifyRequest<{ Body: unknown }>,
    reply: FastifyReply,
  ): Promise<CreateUserResponseContract> => {
    const CreateUserRequestContract = CreateUserRequestValidator.parse(request.body);
    const command = new CreateUserCommand(
      CreateUserRequestContract.email,
      CreateUserRequestContract.fullName,
      CreateUserRequestContract.password,
      request.correlationId,
    );
    const result = await this.commandBus.execute<CreateUserCommand, CreateUserResponseContract>(command);
    reply.status(201);
    return result;
  };
}
