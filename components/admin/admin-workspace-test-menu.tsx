"use client";

import { useState, useTransition } from "react";
import { beginAdminWorkspaceTest } from "@/app/admin/workspace-test-actions";

function isNextRedirectError(e: unknown): boolean {
  return (
    typeof e === "object" &&
    e !== null &&
    "digest" in e &&
    typeof (e as { digest: unknown }).digest === "string" &&
    (e as { digest: string }).digest.startsWith("NEXT_REDIRECT")
  );
}

export function AdminWorkspaceTestMenu() {
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);

  function run(role: "artist" | "dj") {
    setMsg(null);
    start(async () => {
      try {
        const r = await beginAdminWorkspaceTest(role);
        if (r && "error" in r) setMsg(r.error);
      } catch (e) {
        if (isNextRedirectError(e)) return;
        setMsg("Could not switch workspace.");
      }
    });
  }

  return (
    <div className="flex max-w-md flex-col gap-2 rounded-md border border-amber-200/90 bg-amber-50/90 px-3 py-2 dark:border-amber-900/60 dark:bg-amber-950/40">
      <div className="text-[11px] font-medium uppercase tracking-wide text-amber-900 dark:text-amber-200/90">
        Workspace test
      </div>
      <p className="text-xs text-amber-950/80 dark:text-amber-100/80">
        Open the Artist or DJ product as your admin user. Use the amber bar in those areas to switch personas or return
        to Backstage.
      </p>
      {msg ? <p className="text-xs text-red-700 dark:text-red-300">{msg}</p> : null}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={pending}
          className="rounded-md bg-amber-700 px-2.5 py-1.5 text-xs font-medium text-white disabled:opacity-50 dark:bg-amber-600"
          onClick={() => run("artist")}
        >
          Test as Artist
        </button>
        <button
          type="button"
          disabled={pending}
          className="rounded-md bg-amber-700 px-2.5 py-1.5 text-xs font-medium text-white disabled:opacity-50 dark:bg-amber-600"
          onClick={() => run("dj")}
        >
          Test as DJ
        </button>
      </div>
    </div>
  );
}
