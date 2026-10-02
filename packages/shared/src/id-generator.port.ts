/** Abstraction over unique ID generation (UUID v7 in production, deterministic in tests). */
export interface IdGeneratorPort {
  generate(): string;
}
