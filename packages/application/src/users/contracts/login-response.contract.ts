
export type LoginStepStatus = "MFA_REQUIRED" | "PENDING_VERIFICATION" | "SUSPENDED";
export interface LoginResponseContract {
  readonly id: string;
  readonly email: string;
  readonly fullName: string;
  readonly status: LoginStepStatus;
  readonly message: string;
}