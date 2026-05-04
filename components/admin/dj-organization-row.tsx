"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { adminApproveDjOrganization, adminRejectDjOrganization } from "@/app/admin/actions";
import type { ApprovalStatus } from "@/lib/types/database";

export function DjOrganizationRow({
  orgId,
  displayName,
  nameKey,
  moderationStatus,
  formedAt,
  memberCount,
}: {
  orgId: string;
  displayName: string;
  nameKey: string;
  moderationStatus: ApprovalStatus;
  formedAt: string | null;
  memberCount: number;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);

  async function run(fn: () => Promise<{ error?: string } | { ok?: true }>) {
    setMsg(null);
    start(async () => {
      const r = await fn();
      if ("error" in r && r.error) setMsg(r.error);
      else router.refresh();
    });
  }

  const formed = memberCount >= 2;

  return (
    <li className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="font-medium">{displayName}</div>
          <div className="mt-1 text-xs text-zinc-500">
            Key <span className="font-mono">{nameKey}</span> · {memberCount} DJ{memberCount === 1 ? "" : "s"}
            {formed ? " · Formed (2+)" : " · Not yet formed"}
          </div>
          {formedAt ? (
            <div className="mt-1 text-xs text-zinc-500">Formed milestone: {new Date(formedAt).toLocaleString()}</div>
          ) : null}
        </div>
        <div className="text-xs capitalize text-zinc-600 dark:text-zinc-400">
          Org status: <span className="font-medium">{moderationStatus}</span>
        </div>
      </div>

      {moderationStatus === "pending" ? (
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            disabled={pending}
            className="inline-flex min-h-10 items-center rounded-md bg-emerald-700 px-3 text-sm font-medium text-white disabled:opacity-50"
            onClick={() => run(() => adminApproveDjOrganization(orgId))}
          >
            Approve organization
          </button>
          <button
            type="button"
            disabled={pending}
            className="inline-flex min-h-10 items-center rounded-md border border-zinc-300 px-3 text-sm dark:border-zinc-600"
            onClick={() => run(() => adminRejectDjOrganization(orgId))}
          >
            Reject
          </button>
        </div>
      ) : null}

      {msg ? <p className="mt-2 text-xs text-red-600">{msg}</p> : null}
    </li>
  );
}
