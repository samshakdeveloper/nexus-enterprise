import type { DomainEventEnvelope } from "@nexus/domain";

export const escapeHtml = (value: string): string =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

export const getErrorMessage = (error: unknown): string => (error instanceof Error ? error.message : String(error));

export function parseEnvelope(raw: Buffer): DomainEventEnvelope<unknown> | null {
  try {
    return JSON.parse(raw.toString()) as DomainEventEnvelope<unknown>;
  } catch {
    return null;
  }
}
