// infrastructure/src/adapters/crypto-verification-code-generator.adapter.ts

import * as crypto from "crypto";

import { VerificationCodeGeneratorPort } from "@nexus/application";

export class CryptoVerificationCodeGeneratorAdapter implements VerificationCodeGeneratorPort {
  generate(length: number = 6): string {
    // تولید کد ۶ رقمی عددی
    const min = Math.pow(10, length - 1);
    const max = Math.pow(10, length) - 1;
    return crypto.randomInt(min, max + 1).toString();
  }
}
