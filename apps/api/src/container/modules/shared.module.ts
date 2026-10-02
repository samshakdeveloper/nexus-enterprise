import { asValue, type AwilixContainer } from "awilix";

import type { Env } from "../../config/env.js";
import type { CompositionRootContract } from "../composition-root.contract.js";

export function registerSharedModule(container: AwilixContainer<CompositionRootContract>, envPort: Env): void {
  container.register({
    env: asValue(envPort),
  });
}
