import { DefaultPasswordPolicyService } from "@nexus/application";
import { asClass, type AwilixContainer } from "awilix";

import type { CompositionRootContract } from "../composition-root.contract.js";

export function registerapplicationModule(container: AwilixContainer<CompositionRootContract>): void {
  container.register({
    passwordPolicyPort: asClass(DefaultPasswordPolicyService).singleton(),
  });
}
