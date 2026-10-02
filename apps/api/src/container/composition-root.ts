import { createContainer, InjectionMode, type AwilixContainer } from "awilix";

import type { CompositionRootContract } from "./composition-root.contract.js";
import type { Env } from "../config/env.js";
import { registerapplicationModule } from "./modules/application.module.js";
import { registerInfrastructureModule } from "./modules/infrastructure.module.js";
import { registerSharedModule } from "./modules/shared.module.js";
import { registerUserUseCaseModule } from "./modules/uses-cases/user-use-case.module.js";

export function initializeCompositionRoot(env: Env): AwilixContainer<CompositionRootContract> {
  const rootContainer = createContainer<CompositionRootContract>({ injectionMode: InjectionMode.PROXY });

  // 1. Register Modules
  registerSharedModule(rootContainer, env);
  registerInfrastructureModule(rootContainer, env);
  registerapplicationModule(rootContainer);

  // 2. Application Use Cases (Registration & Command Wiring)
  registerUserUseCaseModule(rootContainer);

  return rootContainer;
}

export type { CompositionRootContract };
