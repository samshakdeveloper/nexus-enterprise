"use client";

import { useActionState, type CSSProperties } from "react";
import { createUserAction, type CreateUserFormState } from "./actions";

const initialState: CreateUserFormState = { status: "idle" };

export default function CreateUserPage() {
  const [state, formAction, pending] = useActionState(createUserAction, initialState);

  return (
    <main style={{ maxWidth: 420, margin: "80px auto", padding: 24 }}>
      <h1 style={{ fontSize: 22, marginBottom: 4 }}>Create User</h1>
      <p style={{ color: "#9aa2b1", fontSize: 14, marginBottom: 24 }}>
        Thin Next.js client for the enterprise CreateUser use case.
      </p>

      <form action={formAction} style={{ display: "grid", gap: 12 }}>
        <input name="fullName" placeholder="Full name" required style={inputStyle} />
        <input name="email" type="email" placeholder="Email" required style={inputStyle} />
        <input name="password" type="password" placeholder="Password" required style={inputStyle} />
        <button type="submit" disabled={pending} style={buttonStyle}>
          {pending ? "Creating…" : "Create account"}
        </button>
      </form>

      {state.status === "success" && <p style={{ color: "#4ade80", marginTop: 16 }}>{state.message}</p>}
      {state.status === "error" && <p style={{ color: "#f87171", marginTop: 16 }}>{state.message}</p>}
    </main>
  );
}

const inputStyle: CSSProperties = {
  padding: "10px 12px",
  borderRadius: 8,
  border: "1px solid #2a2f3a",
  background: "#151822",
  color: "#e6e8ee",
};

const buttonStyle: CSSProperties = {
  padding: "10px 12px",
  borderRadius: 8,
  border: "none",
  background: "#5b6cff",
  color: "white",
  fontWeight: 600,
  cursor: "pointer",
};
