"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLayoutEffect, useState, type FormEvent } from "react";
import type { AuthResponse, LoginRequest, PublicUserView, RegisterRequest } from "@/contracts/api";
import { ApiError, apiRequest } from "@/lib/api";
import { errorMessage, fieldMessages } from "@/lib/errorMessages";
import GameButton from "./GameButton";
import Panel from "./Panel";

type FieldName = "username" | "password" | "confirmPassword";

type Field = {
  name: FieldName;
  label: string;
  type: "text" | "password";
  autoComplete: string;
  hint?: string;
};

// Limits follow app/docs/API_CONTRACT.md (register validation).
const USERNAME: Field = {
  name: "username",
  label: "Username",
  type: "text",
  autoComplete: "username",
  hint: "3–30 characters: a–z, numbers, underscore",
};

const FIELDS: Record<"login" | "register", Field[]> = {
  login: [USERNAME, { name: "password", label: "Password", type: "password", autoComplete: "current-password" }],
  register: [
    USERNAME,
    { name: "password", label: "Password", type: "password", autoComplete: "new-password", hint: "At least 6 characters" },
    { name: "confirmPassword", label: "Confirm password", type: "password", autoComplete: "new-password" },
  ],
};

/** Login / register form. Register logs the player straight in, then both go to the main menu. */
export default function AuthForm({ mode }: { mode: "login" | "register" }) {
  const isLogin = mode === "login";
  const router = useRouter();
  const [values, setValues] = useState<Record<FieldName, string>>({ username: "", password: "", confirmPassword: "" });
  const [pending, setPending] = useState(false);
  // INVALID_CREDENTIALS etc. for the whole form; VALIDATION_ERROR `error.fields` per input.
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<FieldName, string>>>({});

  // Next.js keeps a page's state when you leave it (cacheComponents). Reset the form as it is hidden,
  // so coming back after logging out shows a usable form, not "Logging in…" with the old password.
  useLayoutEffect(
    () => () => {
      setPending(false);
      setValues((v) => ({ ...v, password: "", confirmPassword: "" }));
      setFormError(null);
      setFieldErrors({});
    },
    [],
  );

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    // Stay on the page so a failed attempt doesn't wipe what the player typed.
    e.preventDefault();
    if (pending) return;
    setPending(true);
    setFormError(null);
    setFieldErrors({});

    const credentials: LoginRequest = { username: values.username, password: values.password };
    try {
      if (!isLogin) {
        await apiRequest<{ user: PublicUserView }>("/api/auth/register", {
          method: "POST",
          body: { ...credentials, confirmPassword: values.confirmPassword } satisfies RegisterRequest,
        });
      }
      await apiRequest<AuthResponse>("/api/auth/login", { method: "POST", body: credentials });
      router.replace("/");
      router.refresh();
    } catch (error) {
      const code = error instanceof ApiError ? error.code : "INTERNAL_ERROR";
      if (code === "VALIDATION_ERROR" && error instanceof ApiError && error.fields) {
        setFieldErrors(fieldMessages(error.fields));
      } else {
        setFormError(errorMessage(code));
      }
      setPending(false);
    }
  }

  return (
    <Panel title={isLogin ? "Log In" : "Create Account"} accent>
      <form className="flex flex-col gap-4" noValidate onSubmit={handleSubmit}>
        {formError && (
          <p role="alert" className="rounded-sm border-2 border-crimson/70 bg-crimson/15 px-3 py-2 text-sm">
            {formError}
          </p>
        )}

        {FIELDS[mode].map((field) => {
          const error = fieldErrors[field.name];
          return (
            <label key={field.name} className="flex flex-col gap-1">
              <span className="font-semibold">{field.label}</span>
              <input
                name={field.name}
                type={field.type}
                autoComplete={field.autoComplete}
                value={values[field.name]}
                onChange={(e) => setValues((prev) => ({ ...prev, [field.name]: e.target.value }))}
                aria-invalid={error ? true : undefined}
                className={`rounded-sm border-2 bg-ink px-3 py-2 text-parchment outline-none focus:border-gold ${error ? "border-crimson" : "border-frame"}`}
              />
              {error ? (
                <span className="text-sm text-crimson day:text-red-700">{error}</span>
              ) : (
                field.hint && <span className="text-sm text-muted">{field.hint}</span>
              )}
            </label>
          );
        })}

        <GameButton type="submit" variant="primary" disabled={pending} className="mt-2">
          {pending ? (isLogin ? "Logging in…" : "Creating account…") : isLogin ? "Log In" : "Create Account"}
        </GameButton>

        <p className="text-center text-muted">
          {isLogin ? "New here? " : "Already have an account? "}
          <Link href={isLogin ? "/register" : "/login"} className="font-semibold text-gold underline-offset-4 hover:underline">
            {isLogin ? "Create an account" : "Log in"}
          </Link>
        </p>
      </form>
    </Panel>
  );
}
