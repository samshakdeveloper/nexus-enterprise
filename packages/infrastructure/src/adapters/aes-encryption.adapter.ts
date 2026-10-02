// packages/infrastructure/src/adapters/aes-encryption.adapter.ts
import { randomBytes, createCipheriv, createDecipheriv } from "node:crypto";

import { EncryptionPort } from "@nexus/application";

export class AesEncryptionAdapter implements EncryptionPort {
  private readonly algorithm = "aes-256-gcm";
  private readonly key: Buffer;

  // 👈 دریافت کلید مستقیم از ورودی Constructor
  constructor(secretKeyHex: string) {
    if (!secretKeyHex) {
      throw new Error("ENCRYPTION_SECRET_KEY is required.");
    }

    this.key = Buffer.from(secretKeyHex, "hex");
    if (this.key.length !== 32) {
      throw new Error("Encryption key must be exactly 32 bytes (64 hex characters).");
    }
  }

  public encrypt(plaintext: string): Promise<string> {
    const iv = randomBytes(12); // IV ۱۲ بایتی استاندارد برای AES-GCM
    const cipher = createCipheriv(this.algorithm, this.key, iv);

    let encrypted = cipher.update(plaintext, "utf8", "hex");
    encrypted += cipher.final("hex");

    const authTag = cipher.getAuthTag().toString("hex");

    // خروجی ترکیبی: iv:authTag:encrypted
    return Promise.resolve(`${iv.toString("hex")}:${authTag}:${encrypted}`);
  }

  public decrypt(ciphertext: string): Promise<string> {
    const [ivHex, authTagHex, encryptedText] = ciphertext.split(":");
    if (!ivHex || !authTagHex || !encryptedText) {
      throw new Error("Invalid ciphertext format.");
    }

    const iv = Buffer.from(ivHex, "hex");
    const authTag = Buffer.from(authTagHex, "hex");
    const decipher = createDecipheriv(this.algorithm, this.key, iv);

    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encryptedText, "hex", "utf8");
    decrypted += decipher.final("utf8");

    return Promise.resolve(decrypted);
  }

  async encryptFields<T extends object>(data: T, fieldsToEncrypt: (keyof T)[]): Promise<T> {
    const result = { ...data };
    for (const field of fieldsToEncrypt) {
      if (typeof result[field] === "string") {
        result[field] = (await this.encrypt(result[field])) as unknown as T[keyof T];
      }
    }
    return result;
  }

  async decryptFields<T extends object>(data: T, fieldsToDecrypt: (keyof T)[]): Promise<T> {
    const result = { ...data };
    for (const field of fieldsToDecrypt) {
      if (typeof result[field] === "string") {
        result[field] = (await this.decrypt(result[field])) as unknown as T[keyof T];
      }
    }
    return result;
  }
}
