"use client";

import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { describeLoginFailure } from "@/lib/auth/supabase-auth-error";
import { dashboardPathForRole, safeAppPath } from "@/lib/auth/paths";
import { isUserRole } from "@/lib/types/roles";
import { hardNavigate } from "@/lib/capacitor/navigation";

export function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const recovery = searchParams.get("recovery") === "1";

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [feedback, setFeedback] = useState<{ text: string; variant: "error" | "info" } | null>(null);
  const [pending, setPending] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [hasSession, setHasSession] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadSession() {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!cancelled) {
        setHasSession(Boolean(user));
        setCheckingSession(false);
      }
    }

    void loadSession();
    return () => {
      cancelled = true;
    };
  }, []);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setFeedback(null);

    if (password.length < 8) {
      setFeedback({ text: "Password must be at least 8 characters.", variant: "error" });
      return;
    }
    if (password !== confirmPassword) {
      setFeedback({ text: "Passwords do not match.", variant: "error" });
      return;
    }

    setPending(true);
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      setPending(false);
      setFeedback({ text: describeLoginFailure(error), variant: "error" });
      return;
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    let destination = "/login";
    if (user) {
      const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
      if (profile?.role && isUserRole(profile.role)) {
        destination = safeAppPath(null, dashboardPathForRole(profile.role));
      }
    }

    hardNavigate(destination);
  }

  if (checkingSession) {
    return <p className="text-center text-sm text-zinc-400">Checking your reset link…</p>;
  }

  if (!recovery || !hasSession) {
    return (
      <div className="w-full max-w-sm space-y-4 text-center sm:text-left">
        <h1 className="dj-brand dj-glow-text text-2xl font-bold tracking-tight">Reset link expired</h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Open the reset link from your email again, or request a new one.
        </p>
        <Link href="/login/forgot-password" className="dj-btn-primary inline-flex min-h-11 items-center justify-center px-4">
          Request new link
        </Link>
      </div>
    );
  }

  return (
    <div className="w-full max-w-sm space-y-6">
      <div className="space-y-1 text-center sm:text-left">
        <h1 className="dj-brand dj-glow-text text-2xl font-bold tracking-tight">Set new password</h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">Choose a new password for your account.</p>
      </div>

      <form onSubmit={onSubmit} className="space-y-4">
        <label className="block space-y-2">
          <span className="text-sm font-medium">New password</span>
          <input
            name="password"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            value={password}
            onChange={(ev) => setPassword(ev.target.value)}
            className="min-h-11 w-full rounded-lg border border-zinc-200/80 bg-white/90 px-3 text-base outline-none ring-offset-2 backdrop-blur-sm focus-visible:ring-2 focus-visible:ring-cyan-500/40 dark:border-white/10 dark:bg-black/40 dark:focus-visible:ring-fuchsia-500/35"
          />
        </label>

        <label className="block space-y-2">
          <span className="text-sm font-medium">Confirm password</span>
          <input
            name="confirm_password"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            value={confirmPassword}
            onChange={(ev) => setConfirmPassword(ev.target.value)}
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
          {pending ? "Saving…" : "Update password"}
        </button>
      </form>
    </div>
  );
}
