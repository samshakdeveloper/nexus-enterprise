import type { IdGeneratorPort } from "@nexus/shared";
import { v7 as uuidv7 } from "uuid";

/** UUIDv7 — time-ordered, so IDs are also roughly sortable by creation time (helps index locality vs. random v4). */
export class UuidIdGeneratorAdapter implements IdGeneratorPort {
  public generate(): string {
    return uuidv7();
  }
}
