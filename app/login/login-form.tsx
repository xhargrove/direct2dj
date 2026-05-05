"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { applySelectedLoginRole } from "@/app/login/actions";
import { describeLoginFailure } from "@/lib/auth/supabase-auth-error";
import { dashboardPathForRole, safeAppPath } from "@/lib/auth/paths";
import type { UserRole } from "@/lib/types/roles";
import { isUserRole } from "@/lib/types/roles";

/** Where to send the user after email/password sign-in when no `?next=` deep-link is present. */
const WORKSPACE = {
  artist: "/artist",
  dj: "/dj/dashboard",
  admin: "/admin",
} as const;

type WorkspaceKey = keyof typeof WORKSPACE;
type SignupRole = "artist" | "dj";

function workspaceFromNextParam(next: string | null): WorkspaceKey {
  if (!next?.startsWith("/")) return "artist";
  if (next.startsWith("/dj")) return "dj";
  if (next.startsWith("/admin")) return "admin";
  if (next.startsWith("/artist")) return "artist";
  return "artist";
}

export function LoginForm({ showLoginRoleSelector }: { showLoginRoleSelector?: boolean }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextParam = searchParams.get("next");
  const authError = searchParams.get("error");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [feedback, setFeedback] = useState<{ text: string; variant: "error" | "info" } | null>(null);
  const [pending, setPending] = useState(false);
  const [workspace, setWorkspace] = useState<WorkspaceKey>(() => workspaceFromNextParam(nextParam));
  const [signupRole, setSignupRole] = useState<SignupRole>("artist");

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setFeedback(null);
    setPending(true);
    const supabase = createClient();
    const origin = window.location.origin;

    if (mode === "signup") {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${origin}/auth/callback`,
          data: { full_name: fullName, signup_role: signupRole },
        },
      });
      setPending(false);
      if (error) {
        setFeedback({ text: describeLoginFailure(error), variant: "error" });
        return;
      }
      setFeedback({
        text: "If email confirmation is enabled for your project, check your inbox to finish signup. Then sign in below.",
        variant: "info",
      });
      setMode("signin");
      return;
    }

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) {
      setPending(false);
      setFeedback({ text: describeLoginFailure(error), variant: "error" });
      return;
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();
    let role: UserRole = "artist";
    if (user) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();
      if (profile?.role && isUserRole(profile.role)) {
        role = profile.role;
      }
    }

    let redirectRole = role;
    if (mode === "signin" && showLoginRoleSelector) {
      const applied = await applySelectedLoginRole(workspace);
      if ("error" in applied && applied.error) {
        setFeedback({ text: applied.error, variant: "error" });
        setPending(false);
        return;
      }
      redirectRole = workspace;
    }

    const fallback = dashboardPathForRole(redirectRole);

    const deepLink = nextParam;
    const hasSafeDeepLink =
      Boolean(deepLink) &&
      deepLink!.startsWith("/") &&
      !deepLink!.startsWith("//") &&
      !deepLink!.includes("?") &&
      !deepLink!.includes("#");

    const destinationPath = hasSafeDeepLink
      ? deepLink!
      : showLoginRoleSelector
        ? WORKSPACE[workspace]
        : fallback;

    router.push(safeAppPath(destinationPath, fallback));
    router.refresh();
    setPending(false);
  }

  return (
    <div className="w-full max-w-sm space-y-6">
      <div className="space-y-1 text-center sm:text-left">
        <h1 className="dj-brand dj-glow-text text-2xl font-bold tracking-tight">Sign in</h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Enter your booth — Supabase email & password.
        </p>
      </div>

      {authError === "auth" ? (
        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200">
          Session exchange failed. Try signing in again.
        </p>
      ) : null}

      <div className="flex gap-2 rounded-xl border border-white/10 bg-black/20 p-1 dark:border-white/10 dark:bg-black/30">
        <button
          type="button"
          onClick={() => setMode("signin")}
          className={`min-h-11 flex-1 rounded-lg px-3 text-sm font-medium transition ${
            mode === "signin"
              ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-100 dark:text-zinc-950"
              : "text-zinc-600 dark:text-zinc-400"
          }`}
        >
          Sign in
        </button>
        <button
          type="button"
          onClick={() => setMode("signup")}
          className={`min-h-11 flex-1 rounded-lg px-3 text-sm font-medium transition ${
            mode === "signup"
              ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-100 dark:text-zinc-950"
              : "text-zinc-600 dark:text-zinc-400"
          }`}
        >
          Create account
        </button>
      </div>

      {mode === "signin" ? (
        <div className="space-y-2">
          <p className="text-center text-xs font-medium text-zinc-700 dark:text-zinc-300 sm:text-left">
            {showLoginRoleSelector ? "Sign in as (dev/staging also sets account role)" : "Open after sign-in"}
          </p>
          <div className="flex gap-2 rounded-xl border border-white/10 bg-black/20 p-1 dark:border-white/10 dark:bg-black/30">
            {(
              [
                { key: "artist" as const, label: "Artist" },
                { key: "dj" as const, label: "DJ" },
                { key: "admin" as const, label: "Admin" },
              ] as const
            ).map(({ key, label }) => (
              <button
                key={key}
                type="button"
                onClick={() => setWorkspace(key)}
                className={`min-h-11 flex-1 rounded-lg px-2 text-sm font-medium transition ${
                  workspace === key
                    ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-100 dark:text-zinc-950"
                    : "text-zinc-600 dark:text-zinc-400"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            {showLoginRoleSelector ? (
              <>
                One choice for both destination and <code className="font-mono text-[11px]">profiles.role</code> on this
                server (needs <code className="font-mono text-[11px]">SUPABASE_SERVICE_ROLE_KEY</code>). Do not expose
                role switching on untrusted production.
              </>
            ) : (
              <>
                Picks your first screen when you didn&apos;t arrive via a deep link. Your real role in the database
                still controls access — wrong picks redirect to your actual dashboard.
              </>
            )}
          </p>
        </div>
      ) : null}

      {mode === "signup" ? (
        <div className="space-y-2">
          <p className="text-center text-xs font-medium text-zinc-700 dark:text-zinc-300 sm:text-left">
            Create account as
          </p>
          <div className="flex gap-2 rounded-xl border border-white/10 bg-black/20 p-1 dark:border-white/10 dark:bg-black/30">
            {(
              [
                { key: "artist" as const, label: "Artist" },
                { key: "dj" as const, label: "DJ" },
              ] as const
            ).map(({ key, label }) => (
              <button
                key={key}
                type="button"
                onClick={() => setSignupRole(key)}
                className={`min-h-11 flex-1 rounded-lg px-2 text-sm font-medium transition ${
                  signupRole === key
                    ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-100 dark:text-zinc-950"
                    : "text-zinc-600 dark:text-zinc-400"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Admin access cannot be self-selected. DJs will be sent to the application flow for vetting review.
          </p>
        </div>
      ) : null}

      <form onSubmit={onSubmit} className="space-y-4">
        {mode === "signup" ? (
          <label className="block space-y-2">
            <span className="text-sm font-medium">Full name</span>
            <input
              name="full_name"
              type="text"
              autoComplete="name"
              value={fullName}
              onChange={(ev) => setFullName(ev.target.value)}
              className="min-h-11 w-full rounded-lg border border-zinc-200/80 bg-white/90 px-3 text-base outline-none ring-offset-2 backdrop-blur-sm focus-visible:ring-2 focus-visible:ring-cyan-500/40 dark:border-white/10 dark:bg-black/40 dark:focus-visible:ring-fuchsia-500/35"
            />
          </label>
        ) : null}

        <label className="block space-y-2">
          <span className="text-sm font-medium">Email</span>
          <input
            name="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(ev) => setEmail(ev.target.value)}
            className="min-h-11 w-full rounded-lg border border-zinc-200/80 bg-white/90 px-3 text-base outline-none ring-offset-2 backdrop-blur-sm focus-visible:ring-2 focus-visible:ring-cyan-500/40 dark:border-white/10 dark:bg-black/40 dark:focus-visible:ring-fuchsia-500/35"
          />
        </label>

        <label className="block space-y-2">
          <span className="text-sm font-medium">Password</span>
          <input
            name="password"
            type="password"
            autoComplete={mode === "signup" ? "new-password" : "current-password"}
            required
            minLength={8}
            value={password}
            onChange={(ev) => setPassword(ev.target.value)}
            className="min-h-11 w-full rounded-lg border border-zinc-200/80 bg-white/90 px-3 text-base outline-none ring-offset-2 backdrop-blur-sm focus-visible:ring-2 focus-visible:ring-cyan-500/40 dark:border-white/10 dark:bg-black/40 dark:focus-visible:ring-fuchsia-500/35"
          />
        </label>

        {feedback ? (
          <p
            className={
              feedback.variant === "error"
                ? "rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-900 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200"
                : "text-sm text-zinc-700 dark:text-zinc-300"
            }
            role={feedback.variant === "error" ? "alert" : "status"}
          >
            {feedback.text}
          </p>
        ) : null}

        <button type="submit" disabled={pending} className="dj-btn-primary w-full disabled:opacity-60">
          {pending ? "Working…" : mode === "signup" ? "Create account" : "Continue"}
        </button>
      </form>
    </div>
  );
}
