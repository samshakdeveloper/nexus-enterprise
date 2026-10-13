import { z } from "zod";

export const VerifyEmailRequestValidator = z.object({
  email: z
    .string()
    .min(3, { message: "Email is too short." })
    .max(254, { message: "Email exceeds maximum length." })
    .email({ message: "Invalid email address format." }) // ۱. تایید فرمت ایمیل
    .transform((val) => val.toLowerCase().trim()), // ۲. نرمال‌سازی داده‌ها

  code: z
    .string()
    .length(5, { message: "Verification code must be exactly 5 characters." }) // ۳. استفاده از length به جای min/max
    .regex(/^[0-9]+$/, { message: "Verification code must contain digits only." }), // ۴. محدود کردن به پترن عددی
});

export type VerifyEmailRequestContract = z.infer<typeof VerifyEmailRequestValidator>;
