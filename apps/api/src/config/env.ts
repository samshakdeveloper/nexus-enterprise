import path from "node:path";

import dotenv from "dotenv";
import { z } from "zod";

// dotenv.config({ path: path.resolve(__dirname, "../../../../.env") });
dotenv.config({ path: path.resolve(process.cwd(), ".env") });

// z.coerce.boolean() هر رشته‌ی غیرخالی (حتی "false") را true می‌کند؛ در k8s مقدارها همیشه رشته‌اند.
const envBoolean = (fallback: boolean) =>
  z
    .string()
    .optional()
    .transform((value) => {
      if (value === undefined || value.trim() === "") return fallback;
      return ["true", "1", "yes", "on"].includes(value.trim().toLowerCase());
    });

const EnvSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(3000),
  LOG_LEVEL: z.enum(["trace", "debug", "info", "warn", "error"]).default("info"),
  DATABASE_URL: z.string().min(1),
  PRESENTATION_DRIVER: z.enum(["fastify", "next"]).default("fastify"),
  JWT_SECRET: z.string().min(1),
  RATE_LIMIT_MAX: z.coerce.number().int().positive().default(100),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(60_000),
  OTEL_SERVICE_NAME: z.string().default("nexus-api"),
  LOKI_URL: z.string().url().default("http://localhost:3100"),
  SWAGGER_UI_ENABLED: envBoolean(false),
  REBUILD_DOCS: envBoolean(false),
  TRACING_LEVEL: z.enum(["easy", "mid", "hard"]).default("easy"),
  API_PUBLIC_URL: z.string().url().default("http://localhost:3000"),
  AWS_REGION: z.string().default("us-east-1"),
  LOCALSTACK_ENDPOINT: z.string().url().optional().or(z.literal("")),
  CORS_ALLOWED_ORIGINS: z
    .string()
    .default("http://localhost:3000") // مقدار پیش‌فرض
    .transform((val) =>
      val
        .split(",")
        .map((origin) => origin.trim())
        .filter((origin) => origin.length > 0),
    ),

  ENCRYPTION_SECRET_KEY: z.string().length(64, "ENCRYPTION_SECRET_KEY must be exactly 64 hex characters (32 bytes)"),
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
