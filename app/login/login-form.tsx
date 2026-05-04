"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { dashboardPathForRole, safeAppPath } from "@/lib/auth/paths";
import type { UserRole } from "@/lib/types/roles";
import { isUserRole } from "@/lib/types/roles";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextParam = searchParams.get("next");
  const authError = searchParams.get("error");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setMessage(null);
    setPending(true);
    const supabase = createClient();
    const origin = window.location.origin;

    if (mode === "signup") {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${origin}/auth/callback`,
          data: { full_name: fullName },
        },
      });
      setPending(false);
      if (error) {
        setMessage(error.message);
        return;
      }
      setMessage(
        "If email confirmation is enabled for your project, check your inbox to finish signup. Then sign in below.",
      );
      setMode("signin");
      return;
    }

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) {
      setPending(false);
      setMessage(error.message);
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

    const fallback = dashboardPathForRole(role);
    router.push(safeAppPath(nextParam, fallback));
    router.refresh();
    setPending(false);
  }

  return (
    <div className="w-full max-w-sm space-y-6">
      <div className="space-y-1 text-center sm:text-left">
        <h1 className="text-2xl font-semibold tracking-tight">Sign in</h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Use your Supabase Auth email and password.
        </p>
      </div>

      {authError === "auth" ? (
        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200">
          Session exchange failed. Try signing in again.
        </p>
      ) : null}

      <div className="flex gap-2 rounded-lg bg-zinc-100 p-1 dark:bg-zinc-900">
        <button
          type="button"
          onClick={() => setMode("signin")}
          className={`min-h-11 flex-1 rounded-md px-3 text-sm font-medium transition ${
            mode === "signin"
              ? "bg-white shadow dark:bg-zinc-800"
              : "text-zinc-600 dark:text-zinc-400"
          }`}
        >
          Sign in
        </button>
        <button
          type="button"
          onClick={() => setMode("signup")}
          className={`min-h-11 flex-1 rounded-md px-3 text-sm font-medium transition ${
            mode === "signup"
              ? "bg-white shadow dark:bg-zinc-800"
              : "text-zinc-600 dark:text-zinc-400"
          }`}
        >
          Create account
        </button>
      </div>

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
              className="min-h-11 w-full rounded-md border border-zinc-200 bg-white px-3 text-base outline-none ring-offset-2 focus-visible:ring-2 focus-visible:ring-zinc-400 dark:border-zinc-700 dark:bg-zinc-950"
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
            className="min-h-11 w-full rounded-md border border-zinc-200 bg-white px-3 text-base outline-none ring-offset-2 focus-visible:ring-2 focus-visible:ring-zinc-400 dark:border-zinc-700 dark:bg-zinc-950"
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
            className="min-h-11 w-full rounded-md border border-zinc-200 bg-white px-3 text-base outline-none ring-offset-2 focus-visible:ring-2 focus-visible:ring-zinc-400 dark:border-zinc-700 dark:bg-zinc-950"
          />
        </label>

        {message ? (
          <p className="text-sm text-zinc-700 dark:text-zinc-300">{message}</p>
        ) : null}

        <button
          type="submit"
          disabled={pending}
          className="min-h-11 w-full rounded-md bg-zinc-900 px-4 text-sm font-medium text-white transition hover:bg-zinc-800 disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
        >
          {pending ? "Working…" : mode === "signup" ? "Create account" : "Continue"}
        </button>
      </form>
    </div>
  );
}
