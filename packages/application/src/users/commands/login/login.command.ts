import type { Command } from "../../../cqrs/command.js";

// تفکیک نوع کلاینت برای هندلینگ دوگانه کوکی/جیسون در لایه‌های بعدی
export type ClientType = "web" | "mobile";

/**
 * LoginCommand — Application Layer Command for User Authentication.
 * Perfectly immutable and tailored for dual-client architecture tracing.
 */
export class LoginCommand implements Command {
  public readonly commandName = "LoginCommand";

  constructor(
      public readonly email: string,
      public readonly plainTextPassword: string, // 👈 تغییر فیلد از code به پسورد واقعی
      public readonly clientType: ClientType,      // 👈 اضافه شدن نوع کلاینت برای تعیین فلوی توکن
      /** Correlation/trace id propagated from the HTTP layer for end-to-end telemetry. */
      public readonly traceId?: string | undefined,
  ) {}
}