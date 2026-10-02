import type { IdGeneratorPort } from "@nexus/shared";

import { AggregateRoot } from "../shared/aggregate-root.js";
import { UserCreatedEvent } from "./events/user-created.event.js";
import { Email } from "./value-objects/email.vo.js";
import { FullName } from "./value-objects/full-name.vo.js";
import { HashedPassword } from "./value-objects/hashed-password.vo.js";
import { UserId } from "./value-objects/user-id.vo.js";
import { VerificationCode } from "./value-objects/verification-code.vo.js";

export type UserStatus = "PENDING_VERIFICATION" | "ACTIVE" | "SUSPENDED";
//1
interface UserProps {
  email: Email;
  fullName: FullName;
  hashedPassword: HashedPassword;
  status: UserStatus;
  createdAt: Date;
  verificationCode?: VerificationCode | undefined;
  verificationCodeExpiresAt?: Date | undefined;
}
export class User extends AggregateRoot<UserId> {
  private props: UserProps;

  private constructor(id: UserId, props: UserProps) {
    super(id);
    this.props = props;
  }
  //2
  public static register(
    params: {
      id: UserId;
      email: Email;
      fullName: FullName;
      hashedPassword: HashedPassword;
      verificationCodeExpiresAt: Date;
      verificationCode: VerificationCode;
      createdAt: Date;
    },
    deps: { idGenerator: IdGeneratorPort; clock: { now: () => Date }; traceId?: string | undefined },
  ): User {
    //3
    const user = new User(params.id, {
      email: params.email,
      fullName: params.fullName,
      hashedPassword: params.hashedPassword,
      verificationCode: params.verificationCode,
      status: "PENDING_VERIFICATION",
      createdAt: params.createdAt,
      verificationCodeExpiresAt: params.verificationCodeExpiresAt,
    });
    //4

    user.addDomainEvent(
      new UserCreatedEvent(
        params.id.value,
        {
          userId: params.id.value,
          email: params.email.value,
          fullName: params.fullName.value,
          verificationCodeExpiresAt: params.verificationCodeExpiresAt.toISOString(),
          verificationCode: params.verificationCode.value,
        },
        deps.idGenerator,
        deps.clock,
        deps.traceId,
      ),
    );

    return user;
  }

  /** Rehydration from persistence — no events raised, no re-validation of business rules. */
  public static reconstitute(id: UserId, props: UserProps): User {
    return new User(id, props);
  }
  //5
  public get email(): Email {
    return this.props.email;
  }

  public get fullName(): FullName {
    return this.props.fullName;
  }

  public get hashedPassword(): HashedPassword {
    return this.props.hashedPassword;
  }

  public get status(): UserStatus {
    return this.props.status;
  }

  public get createdAt(): Date {
    return this.props.createdAt;
  }
  public get verificationCodeExpiresAt(): Date | undefined {
    return this.props.verificationCodeExpiresAt;
  }

  public get verificationCode(): VerificationCode | undefined {
    return this.props.verificationCode;
  }
  //6
  public toPrimitives() {
    return {
      id: this.id.value,
      email: this.email.value,
      fullName: this.fullName.value,
      hashedPassword: this.hashedPassword.value,
      status: this.status,
      verificationCode: this.verificationCode?.value,
      verificationCodeExpiresAt: this.verificationCodeExpiresAt,
      createdAt: this.createdAt,
    };
  }
}
