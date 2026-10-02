import type { Command, CommandBus, CommandHandler } from "@nexus/application";

export class InMemoryCommandBus implements CommandBus {
  private readonly handlers = new Map<string, CommandHandler<Command, unknown>>();

  public register<TCommand extends Command, TResult>(
    commandName: string,
    handler: CommandHandler<TCommand, TResult>,
  ): void {
    if (this.handlers.has(commandName)) {
      throw new Error(`A handler is already registered for command "${commandName}".`);
    }
    this.handlers.set(commandName, handler);
  }

  public async execute<TCommand extends Command, TResult>(command: TCommand): Promise<TResult> {
    const handler = this.handlers.get(command.commandName);
    if (!handler) {
      throw new Error(`No handler registered for command "${command.commandName}".`);
    }
    return handler.execute(command) as Promise<TResult>;
  }
}
