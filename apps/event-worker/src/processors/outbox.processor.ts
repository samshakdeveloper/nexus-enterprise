// apps/event-worker/src/processors/outbox.processor.ts
import { OutboxRepositoryPort, MessageBrokerPublisherPort } from "@nexus/application";
import { DomainEventTopics, DomainEventEnvelope } from "@nexus/domain";

export class OutboxProcessor {
  constructor(
    private readonly outboxRepo: OutboxRepositoryPort,
    private readonly messageBrokerPublisher: MessageBrokerPublisherPort,
  ) {}

  // اجرا با CronJob یا Interval
  async processPendingEvents(): Promise<void> {
    const pendingMessages = await this.outboxRepo.fetchPendingMessages(50);

    for (const message of pendingMessages) {
      try {
        const topic = DomainEventTopics.USER_EVENTS;
        console.error("DEBUG createdAt:", typeof message.occurred_at, message.occurred_at);

        // ۲. ساخت پیام طبق Contract استاندارد دامین
        const eventEnvelope: DomainEventEnvelope = {
          eventId: message.id,
          type: message.type,
          data: message.payload,
          // اگر traceId نداشت، یک UUID جدید برای شروع Trace ایجاد می‌کنیم
          traceId: message.traceId ?? crypto.randomUUID(),
        };
        await this.messageBrokerPublisher.publish(topic, message.aggregateId, eventEnvelope, message.traceId);

        // علامت‌گذاری به عنوان پردازش شده
        await this.outboxRepo.markAsProcessed(message.id);
      } catch (error) {
        // مدیریت خطا و Retry در صورت نیاز
        console.error(`Failed to publish message ${message.id} to Kafka:`, error);
      }
    }
  }
}
