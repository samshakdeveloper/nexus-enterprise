import type { Command, CommandBus, CommandHandler } from "@nexus/application";
import type { LoggerPort } from "@nexus/shared";
import { trace, SpanStatusCode, context, propagation } from "@opentelemetry/api";

export type TracingLevel = "easy" | "mid" | "hard";

export class TracedCommandBusAdapter implements CommandBus {
  private readonly tracer = trace.getTracer("nexus.command-bus");

  constructor(
    private readonly inner: CommandBus,
    private readonly logger: LoggerPort,
    private readonly tracingLevel: TracingLevel = "mid", // 👈 سطح تریسینگ ورودی
  ) {}

  public register<TCommand extends Command, TResult>(
    commandName: string,
    handler: CommandHandler<TCommand, TResult>,
  ): void {
    this.inner.register(commandName, handler);
  }

  public async execute<TCommand extends Command, TResult>(command: TCommand): Promise<TResult> {
    // ⚡ ۱. اگر سطح easy باشد، اجرای Command را کلاً Trace نمی‌کنیم (Zero Overhead)
    if (this.tracingLevel === "easy") {
      return this.inner.execute<TCommand, TResult>(command);
    }

    // ⚡ ۲. اگر سطح mid یا hard باشد، Span و لاگ ساخته می‌شود
    return this.tracer.startActiveSpan(`command.${command.commandName}`, async (span) => {
      const carrier: Record<string, string> = {};
      propagation.inject(context.active(), carrier);
      span.setAttribute("command.name", command.commandName);

      // در حالت hard جزییات کامل payload کامند را هم لاگ و ثبت می‌کنیم
      if (this.tracingLevel === "hard") {
        span.setAttribute("command.payload", JSON.stringify(command));
      }

      const startedAt = Date.now();
      try {
        const result = await this.inner.execute<TCommand, TResult>(command);
        span.setStatus({ code: SpanStatusCode.OK });

        this.logger.info(`Command ${command.commandName} succeeded`, {
          durationMs: Date.now() - startedAt,
          traceId: span.spanContext().traceId,
        });

        return result;
      } catch (error) {
        span.setStatus({ code: SpanStatusCode.ERROR, message: (error as Error).message });
        span.recordException(error as Error);

        this.logger.error(`Command ${command.commandName} failed`, error, {
          durationMs: Date.now() - startedAt,
          traceId: span.spanContext().traceId,
        });

        throw error;
      } finally {
        span.end();
      }
    });
  }
}
