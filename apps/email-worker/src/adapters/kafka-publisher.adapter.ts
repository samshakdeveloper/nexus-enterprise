// src/adapters/kafka-publisher.adapter.ts
import { Kafka, Producer } from "kafkajs";

import { IEventPublisher } from "../ports/event-publisher.port";

export class KafkaPublisherAdapter implements IEventPublisher {
  private producer: Producer;

  constructor(kafka: Kafka) {
    this.producer = kafka.producer();
  }

  async connect(): Promise<void> {
    await this.producer.connect();
  }

  async publish(topic: string, event: { type: string; payload: Record<string, unknown> }): Promise<void> {
    await this.producer.send({
      topic,
      messages: [
        {
          key: (event.payload["eventId"] as string) || null,
          value: JSON.stringify({
            ...event,
            timestamp: new Date().toISOString(),
          }),
        },
      ],
    });
  }

  async disconnect(): Promise<void> {
    await this.producer.disconnect();
  }
}
