export type UserStatus = "PENDING_VERIFICATION" | "ACTIVE" | "SUSPENDED";
export interface CreateUserResponseContract {
  readonly id: string;
  readonly email: string;
  readonly fullName: string;
  readonly status: UserStatus;
  readonly createdAt: string;
  readonly message: string;
}
