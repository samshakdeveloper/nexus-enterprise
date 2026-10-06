import { describe, it, expect } from "vitest";
import { HashedPassword } from "../src";

describe("HashedPassword Value Object", () => {
  it("should create a HashedPassword instance when given a valid hash string", () => {
    const validHash = "$2b$10$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW";
    const hashedPassword = HashedPassword.fromHash(validHash);

    expect(hashedPassword).toBeInstanceOf(HashedPassword);
    expect(hashedPassword.value).toBe(validHash);
  });

  it("should allow a valid hash with exactly 20 characters", () => {
    const exact20CharHash = "12345678901234567890";
    const hashedPassword = HashedPassword.fromHash(exact20CharHash);

    expect(hashedPassword.value).toBe(exact20CharHash);
  });

  it("should throw an error when provided an empty string", () => {
    expect(() => HashedPassword.fromHash("")).toThrow("Value does not look like a valid password hash.");
  });

  it("should throw an error when provided a hash shorter than 20 characters", () => {
    const shortHash = "1234567890123456789"; // 19 characters
    expect(() => HashedPassword.fromHash(shortHash)).toThrow("Value does not look like a valid password hash.");
  });

  it("should correctly compare two HashedPassword instances for equality", () => {
    const hashStr = "$2b$10$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW";
    const hash1 = HashedPassword.fromHash(hashStr);
    const hash2 = HashedPassword.fromHash(hashStr);
    const hash3 = HashedPassword.fromHash("$2b$10$DifferentHashValueExampleStr20Chars");

    expect(hash1.equals(hash2)).toBe(true);
    expect(hash1.equals(hash3)).toBe(false);
  });
});
