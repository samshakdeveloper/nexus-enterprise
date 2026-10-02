import {
  CommandBus,
  UserRepositoryPort,
  PasswordHasherPort,
  PasswordPolicyPort,
  EventPublisherPort,
  UnitOfWorkPort,
  EncryptionPort,
  CreateUserHandler,
  SecretManagerPort,
  VerificationCodeGeneratorPort,
} from "@nexus/application";
import { PostgresTablesContract } from "@nexus/infrastructure";
import type { SystemClockPort, IdGeneratorPort, LoggerPort } from "@nexus/shared";
import type { Kysely } from "kysely";

import type { Env } from "../config/env.js";

export interface CompositionRootContract {
  env: Env;
  db: Kysely<PostgresTablesContract>;
  loggerPort: LoggerPort;
  clockPort: SystemClockPort;
  idGeneratorPort: IdGeneratorPort;

  userRepositoryPort: UserRepositoryPort;
  passwordHasherPort: PasswordHasherPort;
  passwordPolicyPort: PasswordPolicyPort;
  eventPublisherPort: EventPublisherPort;
  unitOfWorkPort: UnitOfWorkPort;
  encryptionPort: EncryptionPort;
  secretManagerPort: SecretManagerPort;
  verificationCodeGeneratorPort: VerificationCodeGeneratorPort;
  createUserHandler: CreateUserHandler;
  commandBus: CommandBus;
}
