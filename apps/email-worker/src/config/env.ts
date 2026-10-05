// src/config/env.ts
import path from "node:path";

import dotenv from "dotenv";
import { z } from "zod";

dotenv.config({ path: path.resolve(process.cwd(), ".env") });

const EnvSchema = z.object({
  KAFKA_BROKER: z.string().default("127.0.0.1:9092"),
  REDIS_URL: z.string().default("redis://localhost:6379"),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  // تاپیک‌هایی که این ورکر با آن‌ها سروکار دارد
  KAFKA_CONSUME_TOPIC: z.string().default("nexus.user"), // یا identity-events
  KAFKA_REPLY_TOPIC: z.string().default("email.notifications.reply"),
  KAFKA_DLQ_TOPIC: z.string().default("email.notifications.dlq"),

  // 🔹 افزودن تنظیمات SMTP
  SMTP_HOST: z.string().default("smtp.gmail.com"),
  SMTP_PORT: z.coerce.number().default(465),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
});

export type Env = z.infer<typeof EnvSchema>;

export function loadEnv(): Env {
  const parsed = EnvSchema.safeParse(process.env);
  if (!parsed.success) {
    console.error("Invalid environment configuration:", parsed.error.flatten().fieldErrors);
    process.exit(1);
  }
  return parsed.data;
}
