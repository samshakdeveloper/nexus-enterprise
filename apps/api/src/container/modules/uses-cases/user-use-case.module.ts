import { CreateUserCommand, CreateUserHandler, type CreateUserHandlerDependencies } from "@nexus/application";
import { asFunction, type AwilixContainer } from "awilix";

import type { CompositionRootContract } from "../../composition-root.contract.js";

export function registerUserUseCaseModule(container: AwilixContainer<CompositionRootContract>): void {
  container.register({
    createUserHandler: asFunction((cradle: CreateUserHandlerDependencies) => new CreateUserHandler(cradle)).singleton(),
  });

  const { commandBus, createUserHandler } = container.cradle;

  const mappings = [{ command: CreateUserCommand.name, handler: createUserHandler }];

  for (const { command, handler } of mappings) {
    commandBus.register(command, handler);
  }
}
