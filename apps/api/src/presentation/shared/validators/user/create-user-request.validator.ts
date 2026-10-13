import { z } from "zod";

export const CreateUserRequestValidator = z.object({
  email: z
    .string()
    .min(3, { message: "Email is too short." })
    .max(254, { message: "Email exceeds maximum enterprise-safe length." })
    .email({ message: "Invalid email address format." })
    .transform((val) => val.toLowerCase().trim()), // نرمال‌سازی برای جلوگیری از دیتای دوبل با حروف بزرگ و کوچک

  fullName: z
    .string()
    .min(2, { message: "Full name must be at least 2 characters." })
    .max(120, { message: "Full name is too long." })
    .transform((val) => val.trim().replace(/\s+/g, " ")), // تبدیل فضاهای خالیِ متوالی به یک فضا برای تمیزی دیتابیس

  password: z
    .string()
    .min(8, { message: "Password must be at least 8 characters long." })
    .max(128, { message: "Password is too long for enterprise hashing safety." }),
});

export type CreateUserRequestContract = z.infer<typeof CreateUserRequestValidator>;
