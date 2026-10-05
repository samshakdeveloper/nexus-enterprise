// apps/event-worker/src/index.ts
import { KafkaPublisherAdapter } from "@nexus/infrastructure";

import { loadEnv } from "./config/env.js";
import { OutboxRepositoryAdapter } from "./infrastructure/database/outbox-repository.adapter.js";
import { OutboxProcessor } from "./processors/outbox.processor.js";

async function bootstrap() {
  const env = loadEnv();
  console.info(`🌍 Environment loaded successfully [${env.NODE_ENV}]`);

  // ۱. ساخت آداپتورها (Infrastructure Layer)
  const kafkaPublisher = new KafkaPublisherAdapter(env.KAFKA_BROKER);
  await kafkaPublisher.connect();

  const outboxRepo = new OutboxRepositoryAdapter(); // یا پاس دادن Connection دیتابیس

  // ۲. تزریق dependencyها به پردازشگر (Processor / Application Layer)
  const outboxProcessor = new OutboxProcessor(outboxRepo, kafkaPublisher);

  console.info("🚀 Event Worker is up and running...");

  // ۳. اجرا در حلقه زمانی (Polling Loop)
  const intervalId = setInterval(() => {
    outboxProcessor.processPendingEvents().catch((error: unknown) => {
      console.error("[OutboxProcessor] Polling error:", error);
    });
  }, 3000); // هر ۳ ثانیه یک‌بار چک می‌کند

  // Graceful Shutdown
  const shutdown = () => {
    console.info("Shutting down Event Worker...");
    clearInterval(intervalId);
    kafkaPublisher
      .disconnect()
      .then(() => process.exit(0))
      .catch((error: unknown) => {
        console.error("Error during disconnect:", error);
        process.exit(1);
      });
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

bootstrap().catch((err) => {
  console.error("Failed to start Event Worker:", err);
  process.exit(1);
});
