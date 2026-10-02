// packages/application/src/ports/encryption.port.ts

export interface EncryptionPort {
  encrypt(plaintext: string): Promise<string>;
  decrypt(ciphertext: string): Promise<string>;

  // برای Field-Level Encryption رو اشیاء
  encryptFields<T extends object>(data: T, fieldsToEncrypt: (keyof T)[]): Promise<T>;
  decryptFields<T extends object>(data: T, fieldsToDecrypt: (keyof T)[]): Promise<T>;
}

export const ENCRYPTION_PORT = Symbol("ENCRYPTION_PORT");
