"use server";

export interface CreateUserFormState {
  status: "idle" | "success" | "error";
  message?: string;
  userId?: string;
}

interface ApiUserResponse {
  id?: string;
  email?: string;
  error?: {
    message?: string;
  };
}

/**
 * Server Action: calls the Fastify API's CreateUser endpoint from the
 * server side (no client-exposed API URL beyond what's already public,
 * no CORS concerns for this request path). Kept intentionally thin — all
 * business logic lives in the API, this action is transport plumbing only.
 */
export async function createUserAction(
  _prevState: CreateUserFormState,
  formData: FormData,
): Promise<CreateUserFormState> {
  const apiBaseUrl = process.env["NEXT_PUBLIC_API_BASE_URL"] ?? "http://localhost:3000";

  const rawEmail = formData.get("email");
  const rawFullName = formData.get("fullName");
  const rawPassword = formData.get("password");

  const payload = {
    email: typeof rawEmail === "string" ? rawEmail : "",
    fullName: typeof rawFullName === "string" ? rawFullName : "",
    password: typeof rawPassword === "string" ? rawPassword : "",
  };

  try {
    const response = await fetch(`${apiBaseUrl}/api/v1/users`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const body = (await response.json()) as ApiUserResponse;

    if (!response.ok) {
      return { status: "error", message: body.error?.message ?? "Something went wrong." };
    }

    return {
      status: "success",
      userId: body.id,
      message: `User ${body.email ?? "unknown"} created.`,
    };
  } catch {
    return { status: "error", message: "Could not reach the API. Is it running?" };
  }
}
