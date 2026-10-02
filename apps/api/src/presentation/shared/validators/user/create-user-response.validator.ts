import type { CreateUserResponseContract } from "@nexus/application";
import { z } from "zod";

export const CreateUserResponseValidator = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  fullName: z.string(),
  status: z.string(),
  message: z.string(),
  createdAt: z.string(),
}) satisfies z.ZodType<CreateUserResponseContract>;
