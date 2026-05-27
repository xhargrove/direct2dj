"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { describeLoginFailure } from "@/lib/auth/supabase-auth-error";

const RESET_NEXT_PATH = "/login/reset-password";

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [feedback, setFeedback] = useState<{ text: string; variant: "error" | "info" } | null>(null);
  const [pending, setPending] = useState(false);
  const [sent, setSent] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setFeedback(null);
    setPending(true);

    const supabase = createClient();
    const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(RESET_NEXT_PATH)}`;
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo });

    setPending(false);
    if (error) {
      setFeedback({ text: describeLoginFailure(error), variant: "error" });
      return;
    }

    setSent(true);
    setFeedback({
      text: "If an account exists for that email, we sent a link to reset your password. Check your inbox and spam folder.",
      variant: "info",
    });
  }

  return (
    <div className="w-full max-w-sm space-y-6">
      <div className="space-y-1 text-center sm:text-left">
        <h1 className="dj-brand dj-glow-text text-2xl font-bold tracking-tight">Forgot password</h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Enter your account email and we&apos;ll send a reset link.
        </p>
      </div>

      <form onSubmit={onSubmit} className="space-y-4">
        <label className="block space-y-2">
          <span className="text-sm font-medium">Email</span>
          <input
            name="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(ev) => setEmail(ev.target.value)}
            disabled={sent}
            className="min-h-11 w-full rounded-lg border border-zinc-200/80 bg-white/90 px-3 text-base outline-none ring-offset-2 backdrop-blur-sm focus-visible:ring-2 focus-visible:ring-cyan-500/40 disabled:opacity-70 dark:border-white/10 dark:bg-black/40 dark:focus-visible:ring-fuchsia-500/35"
          />
        </label>

        {feedback ? (
          <p
            className={
              feedback.variant === "error"
                ? "rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-900 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200"
                : "rounded-md border border-cyan-900/30 bg-cyan-950/20 px-3 py-2 text-sm text-zinc-200"
            }
            role={feedback.variant === "error" ? "alert" : "status"}
          >
            {feedback.text}
          </p>
        ) : null}

        <button type="submit" disabled={pending || sent} className="dj-btn-primary w-full disabled:opacity-60">
          {pending ? "Sending…" : sent ? "Email sent" : "Send reset link"}
        </button>
      </form>

      <p className="text-center text-sm text-zinc-500 dark:text-zinc-400 sm:text-left">
        Remember your password?{" "}
        <Link href="/login" className="font-medium text-zinc-700 underline underline-offset-4 dark:text-zinc-300">
          Sign in
        </Link>
      </p>
    </div>
  );
}
