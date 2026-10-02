// apps/event-worker/src/processors/outbox.processor.ts
import { OutboxRepositoryPort } from "@nexus/application";
import { DomainEventNames } from "@nexus/domain";

import { KafkaPublisherAdapter } from "../infrastructure/kafka/kafka-publisher.adapter.js";

export class OutboxProcessor {
  constructor(
    private readonly outboxRepo: OutboxRepositoryPort,
    private readonly kafkaPublisher: KafkaPublisherAdapter,
  ) {}

  // اجرا با CronJob یا Interval
  async processPendingEvents(): Promise<void> {
    const pendingMessages = await this.outboxRepo.fetchPendingMessages(50);

    for (const message of pendingMessages) {
      try {
        const topic = DomainEventNames.USER_CREATED;

        // ارسال به کافکا توسط آداپتور اختصاصی Worker
        await this.kafkaPublisher.publish(
          topic,
          message.aggregateId,
          {
            eventId: message.id,
            type: message.type,
            data: message.payload,
          },
          message.traceId,
        );

        // علامت‌گذاری به عنوان پردازش شده
        await this.outboxRepo.markAsProcessed(message.id);
      } catch (error) {
        // مدیریت خطا و Retry در صورت نیاز
        console.error(`Failed to publish message ${message.id} to Kafka:`, error);
      }
    }
  }
}
