import { Kafka, Producer, logLevel } from "kafkajs";

export class KafkaPublisherAdapter {
  private kafka: Kafka;
  private producer: Producer;

  constructor(broker: string) {
    this.kafka = new Kafka({
      clientId: "nexus-outbox-worker",
      brokers: [broker],
      connectionTimeout: 10000, // افزایش زمان تایم‌آوت اتصال
      requestTimeout: 25000,
      retry: {
        initialRetryTime: 300,
        retries: 8,
      },
      logLevel: logLevel.NOTHING, // خاموش کردن لاگ‌های اسپم متوالی کافکا
    });

    this.producer = this.kafka.producer({
      allowAutoTopicCreation: true, // ساخت خودکار تاپیک در صورت عدم وجود
    });
  }

  async connect(): Promise<void> {
    await this.producer.connect();
  }

  async publish(topic: string, key: string, payload: any, traceId?: string): Promise<void> {
    await this.producer.send({
      topic,
      messages: [
        {
          key,
          value: JSON.stringify(payload),
          headers: {
            traceId: traceId || "",
          },
        },
      ],
    });
  }

  async disconnect(): Promise<void> {
    await this.producer.disconnect();
  }
}
