"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import { finalizeSubmissionFromStripeSession } from "@/app/artist/tracks/actions";
import { ARTIST_CHECKOUT_UNAVAILABLE } from "@/lib/billing/stripe-user-copy";

function errorHint(code: string | undefined): string {
  switch (code) {
    case "stripe_not_configured":
      return ARTIST_CHECKOUT_UNAVAILABLE;
    case "missing_payment_metadata":
      return "Checkout metadata was incomplete. Use Billing or New DJ pack to try again, or contact support with your receipt.";
    case "payment_not_found":
      return "We could not match this session to a payment record. Open Billing or start checkout again from New DJ pack.";
    case "not_submission_checkout":
      return "This payment was not a DJ pack submission. Open Billing for details.";
    case "invalid_session":
      return "This Stripe session is invalid or expired. Start again from New DJ pack.";
    case "payment_not_fulfilled":
      return "Payment did not complete. Check Billing; if you were charged, contact support with your receipt.";
    default:
      return "Could not open your draft yet. Check Billing or start again from New DJ pack.";
  }
}

function CompleteSubmissionPoll({ sessionId }: { sessionId: string }) {
  const router = useRouter();
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let attempts = 0;
    const max = 24;
    const delayMs = 1500;

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
          setTimeout(tick, delayMs);
        } else {
          setMsg(
            "Still confirming payment with Stripe. Refresh this page, or open Tracks — your draft usually appears within a minute.",
          );
        }
        return;
      }

      if ("error" in r && r.error) {
        setMsg(errorHint(r.error));
        return;
      }

      setMsg(errorHint(undefined));
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
          <p className="mt-4 flex flex-wrap gap-4 text-center text-sm">
            <Link href="/artist/tracks" className="underline">
              Your tracks
            </Link>
            <Link href="/artist/billing" className="underline">
              Billing
            </Link>
            <Link href="/artist/tracks/new" className="underline">
              New DJ pack
            </Link>
          </p>
        </>
      ) : (
        <>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Confirming payment with Stripe — next you&apos;ll add metadata and upload your pack files.
          </p>
          <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
            Do not close this tab until we redirect you to the upload screen.
          </p>
        </>
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
