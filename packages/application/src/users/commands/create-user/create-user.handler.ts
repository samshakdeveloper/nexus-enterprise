import { User, Email, FullName, HashedPassword, UserId, VerificationCode } from "@nexus/domain";
import type { IdGeneratorPort, SystemClockPort, LoggerPort } from "@nexus/shared";

import type { CreateUserCommand } from "./create-user.command.js";
import { EmailAlreadyInUseError, PasswordPolicyError } from "./create-user.errors.js";
import type { CommandHandler } from "../../../cqrs/command-handler.js";
import type { CreateUserResponseContract } from "../../contracts/create-user-response.contract.js";
import { UserMapper } from "../../mappers/user.mapper.js";
import type { EventPublisherPort } from "../../ports/event-publisher.port.js";
import type { PasswordHasherPort } from "../../ports/password-hasher.port.js";
import type { PasswordPolicyPort } from "../../ports/password-policy.port.js";
import type { UnitOfWorkPort } from "../../ports/unit-of-work.port.js";
import type { UserRepositoryPort } from "../../ports/user-repository.port.js";
import { VerificationCodeGeneratorPort } from "../../ports/verification-code-generator.port.js";

export interface CreateUserHandlerDependencies {
  userRepositoryPort: UserRepositoryPort;
  passwordHasherPort: PasswordHasherPort;
  passwordPolicyPort: PasswordPolicyPort;
  eventPublisherPort: EventPublisherPort;
  unitOfWorkPort: UnitOfWorkPort;
  idGeneratorPort: IdGeneratorPort;
  clockPort: SystemClockPort;
  loggerPort: LoggerPort;
  verificationCodeGeneratorPort: VerificationCodeGeneratorPort;
}

/**
 * CreateUserHandler — Application Use Case Execution.
 * All primitive inputs are converted into Domain Value Objects BEFORE constructing
 * the Aggregate, enforcing early domain boundary validation (Fail-Fast).
 */
export class CreateUserHandler implements CommandHandler<CreateUserCommand, CreateUserResponseContract> {
  constructor(private readonly deps: CreateUserHandlerDependencies) {}

  public async execute(command: CreateUserCommand): Promise<CreateUserResponseContract> {
    const log = this.deps.loggerPort.child({ useCase: "CreateUser", traceId: command.traceId });
    log.info("Handling CreateUserCommand", { email: command.email });

    // 1. Validate application-level password security policy
    const policyResult = this.deps.passwordPolicyPort.validate(command.plainTextPassword);
    if (policyResult.isFailure) {
      throw new PasswordPolicyError(policyResult.error.reason);
    }

    // 2. Construct and validate Value Objects early (Fail-Fast validation)
    const userId = UserId.create(this.deps.idGeneratorPort.generate());
    const email = Email.create(command.email);
    const fullName = FullName.create(command.fullName);
    const hashedPassword = HashedPassword.fromHash(await this.deps.passwordHasherPort.hash(command.plainTextPassword));
    const createdAt = this.deps.clockPort.now();

    const alreadyExists = await this.deps.userRepositoryPort.existsByEmail(email);
    if (alreadyExists) {
      log.warn("Attempted to create user with an email already in use", { email: email.value });
      throw new EmailAlreadyInUseError(email.value);
    }
    // create verification code
    const verificationCode = VerificationCode.create(this.deps.verificationCodeGeneratorPort.generate(5));
    const VERIFICATION_CODE_TTL_MINUTES = 5;
    const verificationCodeExpiresAt = new Date(
      this.deps.clockPort.now().getTime() + VERIFICATION_CODE_TTL_MINUTES * 60 * 1000,
    );

    const userAggregate = User.register(
      {
        id: userId,
        email,
        fullName,
        hashedPassword,
        createdAt,
        verificationCode,
        verificationCodeExpiresAt,
      },
      { idGenerator: this.deps.idGeneratorPort, clock: this.deps.clockPort, traceId: command.traceId },
    );

    // 6. Persist aggregate and publish domain events inside atomic transaction
    await this.deps.unitOfWorkPort.withTransaction(async () => {
      await this.deps.userRepositoryPort.save(userAggregate);
      await this.deps.eventPublisherPort.publish(userAggregate.pullDomainEvents());
    });

    log.info("User created successfully", { userId: userAggregate.id.value });

    return UserMapper.toResponseDto(userAggregate);
  }
}
