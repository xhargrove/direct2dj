"use client";

import { useState, useTransition } from "react";
import {
  exitAdminWorkspaceTest,
  workspaceTestSwitchToArtist,
  workspaceTestSwitchToDj,
} from "@/app/admin/workspace-test-actions";

function isNextRedirectError(e: unknown): boolean {
  return (
    typeof e === "object" &&
    e !== null &&
    "digest" in e &&
    typeof (e as { digest: unknown }).digest === "string" &&
    (e as { digest: string }).digest.startsWith("NEXT_REDIRECT")
  );
}

export function AdminWorkspaceTestBanner({ role }: { role: "artist" | "dj" }) {
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);

  async function wrap(action: () => Promise<{ error?: string } | void>) {
    setMsg(null);
    try {
      const r = await action();
      if (r && typeof r === "object" && "error" in r && r.error) setMsg(r.error);
    } catch (e) {
      if (isNextRedirectError(e)) return;
      setMsg("Action failed.");
    }
  }

  return (
    <div className="border-b border-amber-200/80 bg-amber-50 px-4 py-2 dark:border-amber-900/50 dark:bg-amber-950/50">
      <div className="mx-auto flex max-w-6xl flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-amber-950 dark:text-amber-100/90">
          <span className="font-semibold">Admin workspace test</span> — you are viewing the{" "}
          {role === "artist" ? "Artist" : "DJ"} area with your real account. Data and RLS apply as for this role.
        </p>
        <div className="flex flex-wrap items-center gap-2">
          {msg ? <span className="text-xs text-red-700 dark:text-red-300">{msg}</span> : null}
          {role === "artist" ? (
            <button
              type="button"
              disabled={pending}
              className="rounded-md border border-amber-800/30 bg-white px-2.5 py-1 text-xs font-medium text-amber-950 disabled:opacity-50 dark:border-amber-400/30 dark:bg-zinc-900 dark:text-amber-50"
              onClick={() => start(() => wrap(workspaceTestSwitchToDj))}
            >
              Switch to DJ
            </button>
          ) : (
            <button
              type="button"
              disabled={pending}
              className="rounded-md border border-amber-800/30 bg-white px-2.5 py-1 text-xs font-medium text-amber-950 disabled:opacity-50 dark:border-amber-400/30 dark:bg-zinc-900 dark:text-amber-50"
              onClick={() => start(() => wrap(workspaceTestSwitchToArtist))}
            >
              Switch to Artist
            </button>
          )}
          <button
            type="button"
            disabled={pending}
            className="rounded-md bg-amber-800 px-2.5 py-1 text-xs font-medium text-white disabled:opacity-50 dark:bg-amber-600"
            onClick={() => start(() => wrap(exitAdminWorkspaceTest))}
          >
            Return to admin
          </button>
        </div>
      </div>
    </div>
  );
}
