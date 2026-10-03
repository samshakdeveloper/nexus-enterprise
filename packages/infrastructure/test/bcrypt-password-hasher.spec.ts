import { describe, it, expect } from "vitest";
import { BcryptPasswordHasherAdapter } from "../src";

describe("BcryptPasswordHasher", () => {
  it("hashes a password and can verify it against the original", async () => {
    const hasher = new BcryptPasswordHasherAdapter();
    const hash = await hasher.hash("Str0ngPass!");
    expect(hash).not.toBe("Str0ngPass!");
    expect(await hasher.verify("Str0ngPass!", hash)).toBe(true);
    expect(await hasher.verify("wrong-password", hash)).toBe(false);
  });
});
