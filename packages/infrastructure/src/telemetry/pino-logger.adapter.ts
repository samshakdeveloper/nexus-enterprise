import type { LoggerPort, LogContext } from "@nexus/shared";
import { pino as pinoFactory, type Logger as PinoLogger } from "pino";

/** Binds our internal Logger port to Pino, keeping the concrete library out of every other layer. */
export class PinoLoggerAdapter implements LoggerPort {
  constructor(private readonly pino: PinoLogger) {}

  public static create(level: string): PinoLoggerAdapter {
    // استفاده از named import یا fallback به default جهت اطمینان از callable بودن در تمام محیط‌های اجرا
    const createPino =
      typeof pinoFactory === "function"
        ? pinoFactory
        : (pinoFactory as unknown as { default: typeof pinoFactory }).default;

    const instance = createPino({
      level,
      // pino-pretty کاملاً غیرفعال شد؛ لاگ‌ها به‌صورت Structured JSON استاندارد برای استک مانیتورینگ/Grafana چاپ می‌شوند.
    });

    return new PinoLoggerAdapter(instance);
  }

  trace(message: string, context?: LogContext): void {
    this.pino.trace(context ?? {}, message);
  }

  debug(message: string, context?: LogContext): void {
    this.pino.debug(context ?? {}, message);
  }

  info(message: string, context?: LogContext): void {
    this.pino.info(context ?? {}, message);
  }

  warn(message: string, context?: LogContext): void {
    this.pino.warn(context ?? {}, message);
  }

  error(message: string, error?: unknown, context?: LogContext): void {
    this.pino.error({ ...(context ?? {}), err: error }, message);
  }

  child(bindings: LogContext): LoggerPort {
    return new PinoLoggerAdapter(this.pino.child(bindings));
  }
}
