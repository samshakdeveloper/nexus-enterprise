import type { PasswordHasherPort } from "@nexus/application";
import bcrypt from "bcrypt";

export class BcryptPasswordHasherAdapter implements PasswordHasherPort {
  private static readonly SALT_ROUNDS = 12;

  public async hash(plainTextPassword: string): Promise<string> {
    return bcrypt.hash(plainTextPassword, BcryptPasswordHasherAdapter.SALT_ROUNDS);
  }

  public async verify(plainTextPassword: string, hash: string): Promise<boolean> {
    return bcrypt.compare(plainTextPassword, hash);
  }
}
