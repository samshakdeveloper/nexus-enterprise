export interface VerifyEmailResponseContract {
  readonly email: string;
  readonly status: "ACTIVE";
  readonly message: string;
  readonly verifiedAt: string;
}
