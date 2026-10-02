// src/email-worker.ts
import { DomainEventNames } from "@nexus/domain";
import { Redis } from "ioredis";
import { Kafka, EachMessagePayload } from "kafkajs";

import { KafkaPublisherAdapter } from "./adapters/kafka-publisher.adapter";
import { NodemailerAdapter } from "./adapters/nodemailer.adapter";
import { loadEnv } from "./config/env";

const env = loadEnv();

// 1. Clients Setup
const redis = new Redis(env.REDIS_URL);
const mailProvider = new NodemailerAdapter(env);

const kafka = new Kafka({
  clientId: "nexus-email-worker",
  brokers: [env.KAFKA_BROKER],
});

const consumer = kafka.consumer({ groupId: "nexus-email-service-group" });
const publisher = new KafkaPublisherAdapter(kafka);

const TOPIC_REPLY = env.KAFKA_REPLY_TOPIC;
const TOPIC_DLQ = env.KAFKA_DLQ_TOPIC;

async function handleMessage({ topic, partition, message }: EachMessagePayload) {
  if (!message.value) return;

  const rawEvent = JSON.parse(message.value.toString());
  const { eventId, type, data } = rawEvent;

  // ۱. Idempotency Check با Redis (مستقل و سریع)
  const isNew = await redis.set(`processed_event:${eventId}`, "1", "EX", 86400, "NX");
  if (!isNew) {
    console.log(`[EmailWorker] Event ${eventId} already processed. Skipping.`);
    return;
  }

  try {
    // ۲. پردازش بر اساس نوع ایونت
    switch (type) {
      case DomainEventNames.USER_CREATED:
        await mailProvider.send({
          to: data.email,
          subject: "خوش آمدید!",
          html: `<h1>سلام ${data.firstName}</h1>`,
        });
        break;

      default:
        console.warn(`[EmailWorker] Unhandled event type: ${type}`);
        return;
    }

    // ۳. ارسال ایونت موفقیت به کافکا (EMAIL_SENT)
    await publisher.publish(TOPIC_REPLY, {
      type: DomainEventNames.EMAIL_SENT,
      payload: {
        originalEventId: eventId,
        recipient: data.email,
        sentAt: new Date().toISOString(),
      },
    });

    // ۴. Commit آفست پس از موفقیت کامل
    await consumer.commitOffsets([{ topic, partition, offset: (BigInt(message.offset) + 1n).toString() }]);
  } catch (error: any) {
    console.error(`[EmailWorker] Failed to process event ${eventId}:`, error.message);

    // ۵. ارسال ایونت شکست به Dead Letter Queue (DLQ)
    await publisher.publish(TOPIC_DLQ, {
      type: DomainEventNames.EMAIL_FAILED,
      payload: {
        originalEventId: eventId,
        recipient: data?.email,
        error: error.message,
        failedAt: new Date().toISOString(),
      },
    });

    // در صورت ارسال به DLQ باز هم Offset را کامیت می‌کنیم تا Queue قفل نشود
    await consumer.commitOffsets([{ topic, partition, offset: (BigInt(message.offset) + 1n).toString() }]);
  }
}

export async function startWorker() {
  await publisher.connect();
  await consumer.connect();

  await consumer.subscribe({ topic: env.KAFKA_CONSUME_TOPIC, fromBeginning: false });

  await consumer.run({
    autoCommit: false, // کنترل کاملاً دست ساز
    eachMessage: handleMessage,
  });

  console.log(`🚀 Enterprise Email Worker listening to topic: ${env.KAFKA_CONSUME_TOPIC}`);
}

export async function stopWorker() {
  await consumer.disconnect();
  await publisher.disconnect();
  await redis.quit();
}
