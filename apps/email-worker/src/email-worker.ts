import { DomainEventTopics } from "@nexus/domain";
import { KafkaPublisherAdapter } from "@nexus/infrastructure";
import { Redis } from "ioredis";
import { Kafka } from "kafkajs";

import { NodemailerAdapter } from "./adapters/nodemailer.adapter.js";
import { loadEnv } from "./config/env.js";
import { EmailWorkerHandler } from "./handlers/email-worker.handler.js";

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

// 2. Handler Instance
const workerHandler = new EmailWorkerHandler(redis, mailProvider, publisher, consumer);

// ---------- Lifecycle ----------

export async function startWorker(): Promise<void> {
  await publisher.connect();
  await consumer.connect();

  await consumer.subscribe({ topic: DomainEventTopics.USER_EVENTS, fromBeginning: false });

  await consumer.run({
    autoCommit: false,
    eachMessage: (payload) => workerHandler.handleMessage(payload),
  });

  console.info(`🚀 Enterprise Email Worker listening to topic: ${DomainEventTopics.USER_EVENTS}`);
}

export async function stopWorker(): Promise<void> {
  await consumer.disconnect();
  await publisher.disconnect();
  await redis.quit();
}
