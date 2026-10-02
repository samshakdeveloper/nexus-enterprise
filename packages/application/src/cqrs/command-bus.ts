import type { CommandHandler } from "./command-handler.js";
import type { Command } from "./command.js";

export interface CommandBus {
  register<TCommand extends Command, TResult>(commandName: string, handler: CommandHandler<TCommand, TResult>): void;
  execute<TCommand extends Command, TResult>(command: TCommand): Promise<TResult>;
}
