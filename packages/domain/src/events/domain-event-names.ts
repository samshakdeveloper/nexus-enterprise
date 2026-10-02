// packages/domain/src/events/domain-event-names.ts
export const DomainEventNames = {
  USER_CREATED: "user.created",
  USER_VERIFIED: "user.verified",
  // Integration Events (Worker Notifications / DLQ)
  EMAIL_SENT: "email.sent",
  EMAIL_FAILED: "email.failed",
} as const;

export type DomainEventName = (typeof DomainEventNames)[keyof typeof DomainEventNames];
