// apps/event-worker/src/index.ts
import { loadEnv } from "./config/env.js";
import { OutboxRepositoryAdapter } from "./infrastructure/database/outbox-repository.adapter.js";
import { KafkaPublisherAdapter } from "./infrastructure/kafka/kafka-publisher.adapter.js";
import { OutboxProcessor } from "./processors/outbox.processor.js";

async function bootstrap() {
  const env = loadEnv();
  console.log(`🌍 Environment loaded successfully [${env.NODE_ENV}]`);

  // ۱. ساخت آداپتورها (Infrastructure Layer)
  const kafkaPublisher = new KafkaPublisherAdapter(env.KAFKA_BROKER);
  await kafkaPublisher.connect();

  const outboxRepo = new OutboxRepositoryAdapter(); // یا پاس دادن Connection دیتابیس

  // ۲. تزریق dependencyها به پردازشگر (Processor / Application Layer)
  const outboxProcessor = new OutboxProcessor(outboxRepo, kafkaPublisher);

  console.log("🚀 Event Worker is up and running...");

  // ۳. اجرا در حلقه زمانی (Polling Loop)
  const intervalId = setInterval(async () => {
    await outboxProcessor.processPendingEvents();
  }, 3000); // هر ۳ ثانیه یک‌بار چک می‌کند

  // Graceful Shutdown
  const shutdown = async () => {
    console.log("Shutting down Event Worker...");
    clearInterval(intervalId);
    await kafkaPublisher.disconnect();
    process.exit(0);
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

bootstrap().catch((err) => {
  console.error("Failed to start Event Worker:", err);
  process.exit(1);
});
