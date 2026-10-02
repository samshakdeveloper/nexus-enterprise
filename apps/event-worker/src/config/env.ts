import path from "node:path";

import dotenv from "dotenv";
import { z } from "zod";

dotenv.config({ path: path.resolve(process.cwd(), ".env") });

const EnvSchema = z.object({
  KAFKA_BROKER: z.string().min(1, "KAFKA_BROKER is required in env"),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  DATABASE_URL: z.string().url("DATABASE_URL is required in env"),
});

export type Env = z.infer<typeof EnvSchema>;

/**
 * Fail fast: an invalid/missing environment variable crashes the process
 * at boot with a precise error, rather than surfacing as a confusing
 * runtime failure three layers deep once a request finally touches it.
 */
export function loadEnv(): Env {
  const parsed = EnvSchema.safeParse(process.env);
  if (!parsed.success) {
    console.error("Invalid environment configuration:", parsed.error.flatten().fieldErrors);
    process.exit(1);
  }
  return parsed.data;
}
