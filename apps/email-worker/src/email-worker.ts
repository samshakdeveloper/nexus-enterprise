// src/email-worker.ts
import { DomainEventEnvelope, DomainEventNames, DomainEventTopics } from "@nexus/domain";
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
    console.info(`[EmailWorker] Event ${eventId} already processed. Skipping.`);
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
    const emailSentEnvelope: DomainEventEnvelope = {
      eventId: crypto.randomUUID(),
      type: DomainEventNames.EMAIL_SENT,
      data: {
        originalEventId: eventId,
        recipient: data.email,
        sentAt: new Date().toISOString(),
      },
      traceId: traceId ?? crypto.randomUUID(),
      occurredAt: new Date().toISOString(),
    };
    // ۳. ارسال ایونت موفقیت به کافکا (EMAIL_SENT)
    // await publisher.publish(TOPIC_REPLY, {
    //   type: DomainEventNames.EMAIL_SENT,
    //   payload: {
    //     originalEventId: eventId,
    //     recipient: data.email,
    //     sentAt: new Date().toISOString(),
    //   },
    // });
    await publisher.publish(
      DomainEventTopics.EMAIL_EVENTS, // یا تاپیک مربوطه
      eventId, // Key (مثلاً همان eventId اولیه یا userId)
      emailSentEnvelope,
      emailSentEnvelope.traceId,
    );

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
  // const SUBSCRIBED_TOPICS = [
  //   DomainEventTopics.USER_EVENTS,     // شامل user.created, user.verified, password.reset
  //   DomainEventTopics.ORDER_EVENTS,    // شامل order.placed, order.shipped
  //   DomainEventTopics.PAYMENT_EVENTS,  // شامل payment.failed, receipt.generated
  // ];
  await consumer.subscribe({ topic: DomainEventTopics.USER_EVENTS, fromBeginning: false });

  await consumer.run({
    autoCommit: false, // کنترل کاملاً دست ساز
    eachMessage: handleMessage,
  });

  console.info(`🚀 Enterprise Email Worker listening to topic: ${DomainEventTopics.USER_EVENTS}`);
}

export async function stopWorker() {
  await consumer.disconnect();
  await publisher.disconnect();
  await redis.quit();
}
