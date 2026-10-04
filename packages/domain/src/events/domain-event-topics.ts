// packages/domain/src/events/domain-event-names.ts
export const DomainEventTopics = {
  USER_EVENTS: "nexus.user.events",
  EMAIL_EVENTS: "nexus.email.events",
  DEAD_LETTER_QUEUE: "nexus.dlq.events",
} as const;

export type DomainEventTopic = (typeof DomainEventTopics)[keyof typeof DomainEventTopics];
