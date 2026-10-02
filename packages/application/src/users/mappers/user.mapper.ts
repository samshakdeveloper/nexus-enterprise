import type { User } from "@nexus/domain";

import type { CreateUserResponseContract } from "../contracts/create-user-response.contract.js";

/** Anti-corruption boundary: the domain model never leaks past this point. */
export class UserMapper {
  public static toResponseDto(user: User): CreateUserResponseContract {
    const primitives = user.toPrimitives();
    return {
      message: "Verification code sent to email.",
      id: primitives.id,
      email: primitives.email,
      fullName: primitives.fullName,
      status: primitives.status,
      createdAt: primitives.createdAt.toISOString(),
    };
  }
}
