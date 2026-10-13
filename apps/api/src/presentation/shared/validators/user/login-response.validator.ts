import type { LoginResponseContract } from "@nexus/application";
import { z } from "zod";

export const LoginResponseValidator = z.object({

  id: z.string().uuid({ message: "Internal Error: Invalid user ID format inside gateway response." }),
  email: z.string().email({ message: "Internal Error: Invalid email mapping." }),
  fullName: z.string().min(1),
  status: z.enum(["MFA_REQUIRED", "PENDING_VERIFICATION", "SUSPENDED"]), // 👈 تطابق کامل با قرارداد بالا
  message: z.string().min(1),
}) satisfies z.ZodType<LoginResponseContract>;
