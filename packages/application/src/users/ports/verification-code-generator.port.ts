export interface VerificationCodeGeneratorPort {
  generate(length?: number): string;
}
