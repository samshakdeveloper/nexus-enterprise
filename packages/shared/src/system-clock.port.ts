/** Abstraction over "now" so domain/application code is deterministic in tests. */
export interface SystemClockPort {
  now(): Date;
}
