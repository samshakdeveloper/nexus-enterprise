import type { IdGeneratorPort, SystemClockPort } from "@nexus/shared";

import { DomainEventNames, BaseDomainEvent } from "@nexus/domain";

export interface UserVerifiedPayload {
  userId: string;
  email: string;
  verifiedAt: string;
  [key: string]: unknown;
}

export class UserVerifiedEvent extends BaseDomainEvent {
  constructor(
    userId: string,
    payload: UserVerifiedPayload,
    idGenerator: IdGeneratorPort,
    clock: SystemClockPort,
    traceId?: string,
  ) {
    super(DomainEventNames.USER_VERIFIED, userId, payload, idGenerator, clock, traceId);
  }
}
