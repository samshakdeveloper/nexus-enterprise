import type { VerifyEmailResponseContract } from "@nexus/application";
import { z } from "zod";

export const VerifyEmailResponseValidator = z.object({
  email: z.string().email(),
  // ۱. ارائه وضعیت جدید کاربر به کلاینت
  status: z.enum(["ACTIVE"]),
  message: z.string().min(1),
  // ۲. ارائه زمان دقیق تایید برای کارهای آماری و کلاینت
  verifiedAt: z.string().datetime({ message: "Internal Error: Invalid verifiedAt timestamp format." }),
}) satisfies z.ZodType<VerifyEmailResponseContract>;
