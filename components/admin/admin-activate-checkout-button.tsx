"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { adminActivatePaymentCheckout } from "@/app/admin/payments/actions";

export function AdminActivateCheckoutButton({
  sessionId,
  label = "Activate",
}: {
  sessionId: string;
  label?: string;
}) {
  const router = useRouter();
  const [err, setErr] = useState<string | null>(null);
  const [pending, start] = useTransition();

  if (!sessionId.trim()) return null;

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        disabled={pending}
        className="min-h-9 rounded-md border border-zinc-300 px-3 text-sm dark:border-zinc-600"
        onClick={() => {
          setErr(null);
          start(async () => {
            const r = await adminActivatePaymentCheckout(sessionId);
            if ("error" in r && r.error) setErr(r.error);
            else router.refresh();
          });
        }}
      >
        {pending ? "…" : label}
      </button>
      {err ? <span className="max-w-[14rem] text-right text-xs text-red-600">{err}</span> : null}
    </div>
  );
}
