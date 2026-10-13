import { z } from "zod";

export const LoginRequestValidator = z.object({
  email: z
    .string()
    .min(3, { message: "Email is too short." })
    .max(254, { message: "Email exceeds maximum length." })
    .email({ message: "Invalid email address format." }) // ۱. تایید فرمت ایمیل
    .transform((val) => val.toLowerCase().trim()), // ۲. نرمال‌سازی داده‌ها

  password: z
      .string()
      .min(8, { message: "Password structural length is invalid." })
      .max(128, { message: "Password exceeds safety limits." }),
});

export type LoginRequestContract = z.infer<typeof LoginRequestValidator>;
