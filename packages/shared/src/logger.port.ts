export interface LogContext {
  [key: string]: unknown;
}

/**
 * Application-wide logging port. Infrastructure binds this to Pino (or any
 * other transport) so domain/application code never depends on a concrete
 * logging library — only on this abstraction.
 */
export interface LoggerPort {
  trace(message: string, context?: LogContext): void;
  debug(message: string, context?: LogContext): void;
  info(message: string, context?: LogContext): void;
  warn(message: string, context?: LogContext): void;
  error(message: string, error?: unknown, context?: LogContext): void;
  child(bindings: LogContext): LoggerPort;
}
