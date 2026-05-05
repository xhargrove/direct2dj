"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import { finalizeSubmissionFromStripeSession } from "@/app/artist/tracks/actions";

function CompleteSubmissionPoll({ sessionId }: { sessionId: string }) {
  const router = useRouter();
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let attempts = 0;
    const max = 12;

    async function tick() {
      const r = await finalizeSubmissionFromStripeSession(sessionId);
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
    <>
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
    </>
  );
}

export function CompleteSubmissionClient() {
  const params = useSearchParams();
  const sessionId = params.get("session_id");

  if (!sessionId) {
    return (
      <div className="mx-auto flex w-full max-w-lg flex-col gap-4">
        <h1 className="text-2xl font-semibold tracking-tight">Checkout session missing</h1>
        <p className="text-sm text-red-600 dark:text-red-400">
          Return from Stripe after payment, or start again from New DJ pack.
        </p>
        <p className="text-center text-sm">
          <Link href="/artist/tracks/new" className="underline">
            New DJ pack
          </Link>
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-lg flex-col gap-4">
      <CompleteSubmissionPoll sessionId={sessionId} />
    </div>
  );
}
