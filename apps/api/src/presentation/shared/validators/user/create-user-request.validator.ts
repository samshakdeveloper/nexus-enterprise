import { z } from "zod";

/**
 * Schema-validated input DTO for the CreateUser use case. Validation here
 * catches malformed *shape* (missing fields, wrong types, obviously bad
 * strings) before the request ever reaches the domain, which validates
 * *business* correctness (a well-formed but already-taken email, etc.).
 * Two validation layers, two different jobs — neither is redundant.
 */
export const CreateUserRequestValidator = z.object({
  email: z.string().min(3).max(254),
  fullName: z.string().min(2).max(120),
  password: z.string().min(8).max(128),
});

export type CreateUserRequestContract = z.infer<typeof CreateUserRequestValidator>;
