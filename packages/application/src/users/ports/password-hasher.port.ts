/** Outbound port for password hashing — application depends on this, not on bcrypt/argon2 directly. */
export interface PasswordHasherPort {
  hash(plainTextPassword: string): Promise<string>;
  verify(plainTextPassword: string, hash: string): Promise<boolean>;
}
