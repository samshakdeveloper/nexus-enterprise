import type { IdGeneratorPort, SystemClockPort } from "@nexus/shared";

import { DomainEventNames, BaseDomainEvent } from "@nexus/domain";

export interface UserCreatedPayload {
  userId: string;
  email: string;
  fullName: string;
  [key: string]: unknown;
}

/**
 * Raised once a User aggregate has been successfully constructed and passed
 * all invariants. Consumers (email welcome sender, analytics, audit log)
 * subscribe to this instead of being called directly from the use case —
 * decoupling "a user was created" from "who cares that it happened".
 */
export class UserCreatedEvent extends BaseDomainEvent {
  constructor(
    userId: string,
    payload: UserCreatedPayload,
    idGenerator: IdGeneratorPort,
    clock: SystemClockPort,
    traceId?: string,
  ) {
    super(DomainEventNames.USER_CREATED, userId, payload, idGenerator, clock, traceId);
  }
}
