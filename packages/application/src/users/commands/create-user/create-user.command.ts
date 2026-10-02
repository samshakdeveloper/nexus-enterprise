import type { Command } from "../../../cqrs/command.js";

export class CreateUserCommand implements Command {
  public readonly commandName = "CreateUserCommand";

  constructor(
    public readonly email: string,
    public readonly fullName: string,
    public readonly plainTextPassword: string,
    /** Correlation/trace id propagated from the HTTP layer, threaded all the way into the raised domain event. */
    public readonly traceId?: string | undefined,
  ) {}
}
