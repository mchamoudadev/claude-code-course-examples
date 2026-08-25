"use client";

import { useId, useRef, useState, type FormEvent, type ReactNode } from "react";
import Link from "next/link";
import { AlertIcon, Button, Input, Label } from "@/components";

/** Where to land after auth when no `?next=` is present. */
const APP_HOME = "/dashboard";

type Mode = "signin" | "signup";

interface Errors {
  username?: string;
  password?: string;
}

const COPY: Record<Mode, { title: string; subtitle: string; submit: string }> = {
  signin: {
    title: "Welcome back",
    subtitle: "Sign in to your PostForge workspace.",
    submit: "Sign in",
  },
  signup: {
    title: "Create your account",
    subtitle: "Pick a username and password to get started.",
    submit: "Create account",
  },
};

/** Only follow a same-origin app path from `?next=`; never an absolute URL. */
function nextTarget(): string {
  if (typeof window === "undefined") return APP_HOME;
  const next = new URLSearchParams(window.location.search).get("next");
  if (next && next.startsWith("/") && !next.startsWith("//")) return next;
  return APP_HOME;
}

export function AuthCard({ mode }: { mode: Mode }) {
  const isSignup = mode === "signup";
  const copy = COPY[mode];
  const uid = useId();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<Errors>({});
  const [banner, setBanner] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const usernameRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);

  function validate(): Errors {
    const next: Errors = {};
    const u = username.trim();
    if (!u) next.username = "Enter a username.";
    else if (isSignup && u.length < 3)
      next.username = "Username must be at least 3 characters.";
    else if (isSignup && !/^[a-zA-Z0-9_-]+$/.test(u))
      next.username = "Use letters, numbers, hyphen or underscore only.";
    if (!password) next.password = "Enter your password.";
    else if (isSignup && password.length < 8)
      next.password = "Use at least 8 characters.";
    return next;
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (loading) return;
    const next = validate();
    setErrors(next);
    const firstKey = (["username", "password"] as const).find((k) => next[k]);
    if (firstKey) {
      setBanner(next[firstKey] ?? "Please fix the highlighted fields.");
      (firstKey === "username" ? usernameRef : passwordRef).current?.focus();
      return;
    }

    setBanner(null);
    setLoading(true);
    try {
      const res = await fetch(`/api/auth/${isSignup ? "register" : "login"}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: username.trim(), password }),
      });
      if (res.ok) {
        // Full navigation so the proxy re-evaluates the new session cookie.
        window.location.assign(nextTarget());
        return;
      }
      const body = (await res.json().catch(() => null)) as
        | { error?: { message?: string } }
        | null;
      setBanner(
        body?.error?.message ??
          (isSignup ? "Could not create account." : "Could not sign in."),
      );
      setLoading(false);
    } catch {
      setBanner("Network error — check your connection and try again.");
      setLoading(false);
    }
  }

  function clearError(key: keyof Errors) {
    setErrors((prev) => (prev[key] ? { ...prev, [key]: undefined } : prev));
    if (banner) setBanner(null);
  }

  return (
    <div className="w-full max-w-[412px]">
      <div className="rounded-[18px] border border-border bg-surface p-7 shadow-[0_16px_44px_-22px_rgba(11,18,16,0.24)]">
        <div className="mb-[22px] text-center">
          <h1 className="text-[23px] font-semibold tracking-[-0.02em]">{copy.title}</h1>
          <p className="mt-[7px] text-sm text-secondary">{copy.subtitle}</p>
        </div>

        <form onSubmit={onSubmit} noValidate>
          <div className="mb-[13px]">
            <Label htmlFor={`${uid}-username`} className="mb-1.5">
              Username
            </Label>
            <Input
              id={`${uid}-username`}
              ref={usernameRef}
              value={username}
              onChange={(e) => {
                setUsername(e.target.value);
                clearError("username");
              }}
              placeholder="ada_lovelace"
              autoComplete="username"
              autoCapitalize="none"
              spellCheck={false}
              invalid={Boolean(errors.username)}
              aria-describedby={errors.username ? `${uid}-username-err` : undefined}
            />
            {errors.username ? (
              <FieldMessage id={`${uid}-username-err`}>{errors.username}</FieldMessage>
            ) : null}
          </div>

          <div className="mb-3.5">
            <Label htmlFor={`${uid}-password`} className="mb-1.5">
              Password
            </Label>
            <Input
              id={`${uid}-password`}
              ref={passwordRef}
              type="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                clearError("password");
              }}
              placeholder="••••••••"
              autoComplete={isSignup ? "new-password" : "current-password"}
              invalid={Boolean(errors.password)}
              aria-describedby={errors.password ? `${uid}-password-err` : undefined}
            />
            {errors.password ? (
              <FieldMessage id={`${uid}-password-err`}>{errors.password}</FieldMessage>
            ) : null}
          </div>

          {banner ? (
            <div
              role="alert"
              className="mb-3.5 flex items-center gap-2 rounded-[10px] border border-error-border bg-error-tint px-3 py-2.5 text-[13px] text-error-fg"
            >
              <AlertIcon size={15} className="shrink-0" />
              {banner}
            </div>
          ) : null}

          <Button type="submit" size="lg" fullWidth loading={loading}>
            {loading
              ? isSignup
                ? "Creating account…"
                : "Signing you in…"
              : copy.submit}
          </Button>
        </form>
      </div>

      <p className="mt-5 text-center text-sm text-secondary">
        {isSignup ? (
          <>
            Already have an account?{" "}
            <Link href="/sign-in" className="font-semibold text-primary hover:underline">
              Sign in
            </Link>
          </>
        ) : (
          <>
            New to PostForge?{" "}
            <Link href="/sign-up" className="font-semibold text-primary hover:underline">
              Create an account
            </Link>
          </>
        )}
      </p>
    </div>
  );
}

function FieldMessage({ id, children }: { id: string; children: ReactNode }) {
  return (
    <p id={id} className="mt-2 flex items-center gap-2 text-[13px] text-error-fg">
      <AlertIcon size={15} className="shrink-0" />
      {children}
    </p>
  );
}
