import {
  CommandBus,
  CreateUserResponseContract,
  VerifyEmailCommand,
  VerifyEmailResponseContract,LoginCommand,
  CreateUserCommand,LoginResponseContract
} from "@nexus/application";
import type { FastifyRequest, FastifyReply } from "fastify";

import { CreateUserRequestValidator } from "../../shared/validators/user/create-user-request.validator.js";
import { LoginRequestValidator } from "../../shared/validators/user/login-request.validator.js";
import { VerifyEmailRequestValidator } from "../../shared/validators/user/verify-email-request.validator.js";


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
    return reply.status(201).send(result);
  };

  public verifyEmail = async (
    request: FastifyRequest<{ Body: unknown }>,
    reply: FastifyReply,
  ): Promise<VerifyEmailResponseContract> => {
    const verifyEmailRequestContract = VerifyEmailRequestValidator.parse(request.body);
    const command = new VerifyEmailCommand(
      verifyEmailRequestContract.code,
      verifyEmailRequestContract.email,
      request.correlationId,
    );
    const result = await this.commandBus.execute<VerifyEmailCommand, VerifyEmailResponseContract>(command);
    return reply.status(200).send(result);
  };


  public login = async (
      request: FastifyRequest<{ Body: unknown }>,
      reply: FastifyReply,
  ): Promise<LoginResponseContract> => {
    const loginRequestContract = LoginRequestValidator.parse(request.body);
    // ۲. استخراج نوع کلاینت از هدر تایید شده گیت‌وی (با فالبک به وب برای امنیت بیشتر)
    const clientTypeHeader = request.headers["x-internal-client-type"];
    const clientType = clientTypeHeader === "mobile" ? "mobile" : "web";

    const command = new LoginCommand(
        loginRequestContract.email,
        loginRequestContract.password,
        clientType,
        request.correlationId,
    );
    const result = await this.commandBus.execute<LoginCommand, LoginResponseContract>(command);
    return reply.status(200).send(result);
  };
}
