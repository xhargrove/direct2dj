"use client";

import Link from "next/link";
import { useEffect } from "react";
import { forceHardReloadPage, hardNavigate, isChunkLoadError, isLoadFailedMessage, isNativeAppShell, tryNativeShellRecovery } from "@/lib/capacitor/navigation";
import { isNextRedirectError, redirectTargetFromDigest } from "@/lib/next/redirect-error";

function isSupabaseConfigError(message: string): boolean {
  return /missing next_public_supabase/i.test(message);
}

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const native = typeof window !== "undefined" && isNativeAppShell();
  const message = error.message ?? "";
  const chunkStale = isChunkLoadError(message, error.name);
  const loadFailed = isLoadFailedMessage(message);
  const redirectError = isNextRedirectError(error);
  const supabaseConfig = isSupabaseConfigError(message);

  useEffect(() => {
    console.error("[app error]", error.digest, error.message);

    if (redirectError && error.digest) {
      const target = redirectTargetFromDigest(error.digest);
      if (target) {
        window.location.assign(target);
        return;
      }
      window.location.reload();
      return;
    }

    if (chunkStale || loadFailed) {
      if (native) {
        tryNativeShellRecovery(error);
        return;
      }
      forceHardReloadPage();
    }
  }, [error, native, chunkStale, loadFailed, redirectError]);

  function reloadApp() {
    if (redirectError || chunkStale || loadFailed) {
      forceHardReloadPage();
      return;
    }
    if (native) {
      forceHardReloadPage();
      return;
    }
    reset();
  }

  return (
    <div className="mx-auto flex min-h-[50vh] max-w-md flex-col justify-center gap-4 px-4 py-16 text-center">
      <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Something went wrong</h1>
      {redirectError ? (
        <p className="text-sm text-zinc-600 dark:text-zinc-400">Redirecting…</p>
      ) : chunkStale ? (
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          {native
            ? "The app was updated while you were browsing. Reloading to fetch the latest version…"
            : "This site was updated while you had it open. Reload to fetch the latest version."}
        </p>
      ) : loadFailed ? (
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          {native
            ? "The app lost connection while loading a page — common in the mobile shell. Reload to continue."
            : "The page lost connection while loading. Reload or try again in a moment."}
        </p>
      ) : supabaseConfig ? (
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Server configuration is missing Supabase keys. Confirm Vercel env includes{" "}
          <code className="rounded bg-zinc-100 px-1 text-xs dark:bg-zinc-800">NEXT_PUBLIC_SUPABASE_URL</code> and{" "}
          <code className="rounded bg-zinc-100 px-1 text-xs dark:bg-zinc-800">NEXT_PUBLIC_SUPABASE_ANON_KEY</code>, then
          redeploy.
        </p>
      ) : native ? (
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Reload the app. If sign-in or checkout fails, use a full reload instead of going back.
        </p>
      ) : (
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Try a hard refresh in Safari (tap and hold Reload, then Reload Without Content Blockers). If you were signing
          in, open <Link href="/login" className="underline">/login</Link> directly.
        </p>
      )}
      {error.message && !redirectError ? (
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
