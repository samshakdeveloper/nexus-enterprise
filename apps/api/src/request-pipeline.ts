import type { AwilixContainer } from "awilix";

import type { CompositionRootContract } from "./container/composition-root.contract.js";
import type { RequestPipelineServerPort } from "./request-pipeline.port.js";

export async function configureRequestPipeline(
  rootContainer: AwilixContainer<CompositionRootContract>,
  adapter: RequestPipelineServerPort,
): Promise<RequestPipelineServerPort> {
  // تایپ ایمن به جای استفاده از `Function`
  const setupAdapter = adapter as {
    setup?: (container: AwilixContainer<CompositionRootContract>) => Promise<void>;
  };

  if (typeof setupAdapter.setup === "function") {
    await setupAdapter.setup(rootContainer);
  }

  return adapter;
}
