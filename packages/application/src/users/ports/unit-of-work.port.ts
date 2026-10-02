/**
 * Unit of Work: guarantees the aggregate write and the outbox insert for
 * its domain events happen in a single atomic transaction (the
 * "transactional outbox" pattern) — never store-then-forget-to-publish or
 * publish-then-fail-to-store.
 */
export interface UnitOfWorkPort {
  withTransaction<T>(work: (trx: unknown) => Promise<T>): Promise<T>;
}
