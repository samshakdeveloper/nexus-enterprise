import type { CreateUserResponseContract } from "@nexus/application";
import { z } from "zod";

export const CreateUserResponseValidator = z.object({
  id: z.string().uuid({ message: "Internal Error: Invalid ID format in response." }),
  email: z.string().email(),
  fullName: z.string().min(1),
  // ۱. استفاده از Enum به جای رشته خام برای وضعیت کاربر
  status: z.enum(["PENDING_VERIFICATION", "ACTIVE", "SUSPENDED"]),
  message: z.string(),
  // ۲. استفاده از فرمت استاندارد ISO برای تاریخ
  createdAt: z.string().datetime({ message: "Internal Error: Invalid timestamp format." }),
}) satisfies z.ZodType<CreateUserResponseContract>;
