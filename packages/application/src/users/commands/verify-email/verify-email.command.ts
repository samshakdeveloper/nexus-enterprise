import type { Command } from "../../../cqrs/command.js";

export class VerifyEmailCommand implements Command {
  public readonly commandName = "VerifyEmailCommand";

  constructor(
    public readonly email: string,
    public readonly code: string,
    /** Correlation/trace id propagated from the HTTP layer, threaded all the way into the raised domain event. */
    public readonly traceId?: string | undefined,
  ) {}
}
