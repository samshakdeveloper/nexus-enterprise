// src/email-worker.ts
import { randomUUID } from "node:crypto";

import { DomainEventNames, DomainEventTopics } from "@nexus/domain";
import type { DomainEventEnvelope, UserCreatedPayload } from "@nexus/domain";
import { KafkaPublisherAdapter } from "@nexus/infrastructure";
import { Redis } from "ioredis";
import { Kafka } from "kafkajs";
import type { EachMessagePayload } from "kafkajs";

import { NodemailerAdapter } from "./adapters/nodemailer.adapter.js";
import { loadEnv } from "./config/env.js";

const IDEMPOTENCY_TTL_SECONDS = 86_400;

const env = loadEnv();

// 1. Clients Setup
const redis = new Redis(env.REDIS_URL);
const mailProvider = new NodemailerAdapter(env);

const kafka = new Kafka({
  clientId: "nexus-email-worker",
  brokers: [env.KAFKA_BROKER],
});

const consumer = kafka.consumer({ groupId: "nexus-email-service-group" });
const publisher = new KafkaPublisherAdapter(env.KAFKA_BROKER);

// ---------- Helpers ----------

const escapeHtml = (value: string): string =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const getErrorMessage = (error: unknown): string => (error instanceof Error ? error.message : String(error));

function parseEnvelope(raw: Buffer): DomainEventEnvelope<unknown> | null {
  try {
    return JSON.parse(raw.toString()) as DomainEventEnvelope<unknown>;
  } catch {
    return null;
  }
}

async function commitOffset({ topic, partition, message }: EachMessagePayload): Promise<void> {
  await consumer.commitOffsets([{ topic, partition, offset: (BigInt(message.offset) + 1n).toString() }]);
}

// ---------- Handler ----------

async function handleMessage(payload: EachMessagePayload): Promise<void> {
  const { message } = payload;
  console.info(`[EmailWorker] Received message at offset ${message.offset}`);
  // پیام خالی یا خراب (poison message) نباید Consumer را قفل کند
  if (!message.value) {
    await commitOffset(payload);
    return;
  }

  const envelope = parseEnvelope(message.value);
  if (!envelope) {
    console.error(`[EmailWorker] Invalid JSON at offset ${message.offset}. Skipping.`);
    await commitOffset(payload);
    return;
  }

  const { eventId, type, traceId } = envelope;

  // اول نوع ایونت چک می‌شود تا برای ایونت‌های نامربوط کلید Redis ساخته نشود
  if (type !== DomainEventNames.USER_CREATED) {
    console.warn(`[EmailWorker] Unhandled event type: ${type}`);
    await commitOffset(payload);
    return;
  }

  // Idempotency Check با Redis
  const idempotencyKey = `processed_event:${eventId}`;
  const isNew = await redis.set(idempotencyKey, "1", "EX", IDEMPOTENCY_TTL_SECONDS, "NX");
  if (!isNew) {
    console.info(`[EmailWorker] Event ${eventId} already processed. Skipping.`);
    await commitOffset(payload);
    return;
  }

  const { data } = envelope as DomainEventEnvelope<UserCreatedPayload>;
  const getString = (data: UserCreatedPayload, key: string): string | null => {
    const value = data[key];
    return typeof value === "string" ? value : null;
  };

  const resolvedTraceId = traceId ?? randomUUID();
  const verificationCode = getString(data, "verificationCode");
  // const expiresAt = getString(data, "verificationCodeExpiresAt");
  const fullName = data.fullName || " dear ";

  try {
    await mailProvider.send({
      to: data.email,
      subject: "welcome",
      html: `<h1>سلام ${escapeHtml(fullName)}</h1>${
        verificationCode
          ? `<p>verification code : <b>${escapeHtml(verificationCode)}</b></p>
            `
          : ""
      }`,
    });
    console.info(`[EmailWorker] Email sent to ${data.email} (event ${eventId})`);

    // ایمیل ارسال شده؛ شکست در انتشار EMAIL_SENT نباید باعث ارسال دوباره ایمیل شود
    const emailSentEnvelope: DomainEventEnvelope = {
      eventId: randomUUID(),
      type: DomainEventNames.EMAIL_SENT,
      data: {
        originalEventId: eventId,
        recipient: data.email,
        sentAt: new Date().toISOString(),
      },
      traceId: resolvedTraceId,
    };

    try {
      await publisher.publish(DomainEventTopics.EMAIL_EVENTS, eventId, emailSentEnvelope, resolvedTraceId);
    } catch (error: unknown) {
      console.error(`[EmailWorker] Email sent but EMAIL_SENT publish failed for ${eventId}:`, getErrorMessage(error));
    }
  } catch (error: unknown) {
    const reason = getErrorMessage(error);
    console.error(`[EmailWorker] Failed to process event ${eventId}:`, reason);

    // کلید حذف می‌شود تا در صورت ارسال مجدد همین ایونت، دوباره تلاش شود
    await redis.del(idempotencyKey);

    const emailFailedEnvelope: DomainEventEnvelope = {
      eventId: randomUUID(),
      type: DomainEventNames.EMAIL_FAILED,
      data: {
        originalEventId: eventId,
        recipient: data.email,
        error: reason,
        failedAt: new Date().toISOString(),
      },
      traceId: resolvedTraceId,
    };

    // اگر این publish شکست بخورد، خطا بالا می‌رود و کافکا پیام را دوباره می‌فرستد
    await publisher.publish(DomainEventTopics.EMAIL_EVENTS, eventId, emailFailedEnvelope, resolvedTraceId);
    await commitOffset(payload);
    return;
  }

  // Commit آفست پس از پردازش کامل
  await commitOffset(payload);
}

// ---------- Lifecycle ----------

export async function startWorker(): Promise<void> {
  await publisher.connect();
  await consumer.connect();

  await consumer.subscribe({ topic: DomainEventTopics.USER_EVENTS, fromBeginning: false });

  await consumer.run({
    autoCommit: false, // کامیت دستی
    eachMessage: handleMessage,
  });

  console.info(`🚀 Enterprise Email Worker listening to topic: ${DomainEventTopics.USER_EVENTS}`);
}

export async function stopWorker(): Promise<void> {
  await consumer.disconnect();
  await publisher.disconnect();
  await redis.quit();
}
