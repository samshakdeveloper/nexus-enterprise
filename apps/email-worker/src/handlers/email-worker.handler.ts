import { randomUUID } from "node:crypto";

import { DomainEventNames, DomainEventTopics } from "@nexus/domain";
import type { DomainEventEnvelope, UserCreatedPayload } from "@nexus/domain";
import type { KafkaPublisherAdapter } from "@nexus/infrastructure";
import type { Redis } from "ioredis";
import type { Consumer, EachMessagePayload } from "kafkajs";

import type { NodemailerAdapter } from "../adapters/nodemailer.adapter.js";
import { escapeHtml, getErrorMessage, parseEnvelope } from "../utils/worker.helpers.js";

const IDEMPOTENCY_TTL_SECONDS = 86_400;

export class EmailWorkerHandler {
  constructor(
    private readonly redis: Redis,
    private readonly mailProvider: NodemailerAdapter,
    private readonly publisher: KafkaPublisherAdapter,
    private readonly consumer: Consumer,
  ) {}

  private async commitOffset({ topic, partition, message }: EachMessagePayload): Promise<void> {
    await this.consumer.commitOffsets([{ topic, partition, offset: (BigInt(message.offset) + 1n).toString() }]);
  }

  public async handleMessage(payload: EachMessagePayload): Promise<void> {
    const { message } = payload;
    console.info(`[EmailWorker] Received message at offset ${message.offset}`);

    if (!message.value) {
      await this.commitOffset(payload);
      return;
    }

    const envelope = parseEnvelope(message.value);
    if (!envelope) {
      console.error(`[EmailWorker] Invalid JSON at offset ${message.offset}. Skipping.`);
      await this.commitOffset(payload);
      return;
    }

    const { eventId, type, traceId } = envelope;

    if (type !== DomainEventNames.USER_CREATED) {
      console.warn(`[EmailWorker] Unhandled event type: ${type}`);
      await this.commitOffset(payload);
      return;
    }

    const idempotencyKey = `processed_event:${eventId}`;
    const isNew = await this.redis.set(idempotencyKey, "1", "EX", IDEMPOTENCY_TTL_SECONDS, "NX");
    if (!isNew) {
      console.info(`[EmailWorker] Event ${eventId} already processed. Skipping.`);
      await this.commitOffset(payload);
      return;
    }

    const { data } = envelope as DomainEventEnvelope<UserCreatedPayload>;
    const getString = (data: UserCreatedPayload, key: string): string | null => {
      const value = data[key];
      return typeof value === "string" ? value : null;
    };

    const resolvedTraceId = traceId ?? randomUUID();
    const verificationCode = getString(data, "verificationCode");
    const fullName = data.fullName || " dear ";

    try {
      await this.mailProvider.send({
        to: data.email,
        subject: "welcome",
        html: `<h1>hi ${escapeHtml(fullName)}</h1>${
          verificationCode ? `<p>verification code : <b>${escapeHtml(verificationCode)}</b></p>` : ""
        }`,
      });
      console.info(`[EmailWorker] Email sent to ${data.email} (event ${eventId})`);

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
        await this.publisher.publish(DomainEventTopics.EMAIL_EVENTS, eventId, emailSentEnvelope, resolvedTraceId);
      } catch (error: unknown) {
        console.error(`[EmailWorker] Email sent but EMAIL_SENT publish failed for ${eventId}:`, getErrorMessage(error));
      }
    } catch (error: unknown) {
      const reason = getErrorMessage(error);
      console.error(`[EmailWorker] Failed to process event ${eventId}:`, reason);

      await this.redis.del(idempotencyKey);

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

      await this.publisher.publish(DomainEventTopics.EMAIL_EVENTS, eventId, emailFailedEnvelope, resolvedTraceId);
      await this.commitOffset(payload);
      return;
    }

    await this.commitOffset(payload);
  }
}
