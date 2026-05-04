"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import { finalizeSubmissionFromStripeSession } from "@/app/artist/tracks/actions";

export function CompleteSubmissionClient() {
  const router = useRouter();
  const params = useSearchParams();
  const sessionId = params.get("session_id");
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!sessionId) {
      setMsg("Missing checkout session.");
      return;
    }

    const sid = sessionId;

    let cancelled = false;
    let attempts = 0;
    const max = 12;

    async function tick() {
      const r = await finalizeSubmissionFromStripeSession(sid);
      if (cancelled) return;

      if (r.ok) {
        router.replace(`/artist/tracks/${r.trackId}/edit`);
        router.refresh();
        return;
      }

      if ("pending" in r && r.pending) {
        attempts += 1;
        if (attempts < max) {
          setTimeout(tick, 1500);
        } else {
          setMsg(
            "Still confirming payment. Try refreshing this page or open your tracks list in a moment.",
          );
        }
        return;
      }

      setMsg("Could not open your draft. Check Billing or start again from New DJ pack.");
    }

    void tick();

    return () => {
      cancelled = true;
    };
  }, [sessionId, router]);

  return (
    <div className="mx-auto flex w-full max-w-lg flex-col gap-4">
      <h1 className="text-2xl font-semibold tracking-tight">Opening your DJ pack…</h1>
      {msg ? (
        <>
          <p className="text-sm text-red-600 dark:text-red-400">{msg}</p>
          <p className="text-center text-sm">
            <Link href="/artist/tracks" className="underline">
              Back to tracks
            </Link>
          </p>
        </>
      ) : (
        <p className="text-sm text-zinc-600 dark:text-zinc-400">Confirming payment with Stripe.</p>
      )}
    </div>
  );
}
