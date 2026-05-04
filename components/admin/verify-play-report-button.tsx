"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { verifyPlayReport } from "@/app/admin/actions";

export function VerifyPlayReportButton({ playReportId }: { playReportId: string }) {
  const router = useRouter();
  const [err, setErr] = useState<string | null>(null);
  const [pending, start] = useTransition();

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        disabled={pending}
        className="min-h-9 rounded-md border border-zinc-300 px-3 text-sm dark:border-zinc-600"
        onClick={() => {
          setErr(null);
          start(async () => {
            const r = await verifyPlayReport(playReportId);
            if ("error" in r && r.error) setErr(r.error);
            else router.refresh();
          });
        }}
      >
        {pending ? "…" : "Mark verified"}
      </button>
      {err ? <span className="max-w-[12rem] text-right text-xs text-red-600">{err}</span> : null}
    </div>
  );
}
