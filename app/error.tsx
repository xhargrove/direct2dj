"use client";

import Link from "next/link";
import { useEffect } from "react";
import { hardNavigate, isNativeAppShell } from "@/lib/capacitor/navigation";

function isLoadFailedError(error: Error): boolean {
  const msg = error.message?.toLowerCase() ?? "";
  return msg.includes("load failed") || msg.includes("failed to fetch") || msg.includes("networkerror");
}

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const native = typeof window !== "undefined" && isNativeAppShell();
  const loadFailed = isLoadFailedError(error);

  useEffect(() => {
    console.error("[app error]", error.digest, error.message);
  }, [error]);

  function reloadApp() {
    if (native) {
      hardNavigate(window.location.pathname + window.location.search);
      return;
    }
    reset();
  }

  return (
    <div className="mx-auto flex min-h-[50vh] max-w-md flex-col justify-center gap-4 px-4 py-16 text-center">
      <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Something went wrong</h1>
      {native && loadFailed ? (
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          The app lost connection while loading a page — common in the mobile shell. Reload to continue.
        </p>
      ) : native ? (
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Reload the app. If sign-in or checkout fails, use a full reload instead of going back.
        </p>
      ) : (
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Try again. If this keeps happening, confirm Vercel env includes{" "}
          <code className="rounded bg-zinc-100 px-1 text-xs dark:bg-zinc-800">NEXT_PUBLIC_SUPABASE_URL</code> and{" "}
          <code className="rounded bg-zinc-100 px-1 text-xs dark:bg-zinc-800">NEXT_PUBLIC_SUPABASE_ANON_KEY</code>, and
          run pending Supabase migrations.
        </p>
      )}
      {error.message && !loadFailed ? (
        <p className="font-mono text-xs text-zinc-500">{error.message}</p>
      ) : null}
      {error.digest ? (
        <p className="font-mono text-xs text-zinc-500">Digest: {error.digest}</p>
      ) : null}
      <div className="flex flex-wrap justify-center gap-3">
        <button
          type="button"
          onClick={reloadApp}
          className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white dark:bg-zinc-100 dark:text-zinc-900"
        >
          {native ? "Reload app" : "Try again"}
        </button>
        <Link
          href="/"
          onClick={(e) => {
            if (native) {
              e.preventDefault();
              hardNavigate("/");
            }
          }}
          className="rounded-md border border-zinc-300 px-4 py-2 text-sm dark:border-zinc-600"
        >
          Home
        </Link>
      </div>
    </div>
  );
}
