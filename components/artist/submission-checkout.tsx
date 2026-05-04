"use client";

import { useMemo, useState } from "react";
import { startSubmissionCheckout } from "@/app/artist/tracks/actions";

export type SubmissionTierOption = {
  id: string;
  slug: string;
  label: string;
  price_cents: number;
  currency: string | null;
};

function formatMoney(cents: number, currency: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(cents / 100);
}

export function SubmissionCheckout({ tiers }: { tiers: SubmissionTierOption[] }) {
  const sorted = useMemo(
    () => [...tiers].sort((a, b) => a.price_cents - b.price_cents),
    [tiers],
  );

  const [selectedId, setSelectedId] = useState<string>(() => sorted[0]?.id ?? "");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selected = sorted.find((t) => t.id === selectedId) ?? sorted[0];

  async function onCheckout() {
    if (!selected) {
      setError("Choose a plan.");
      return;
    }
    setError(null);
    setPending(true);
    const r = await startSubmissionCheckout(selected.id);
    setPending(false);
    if ("error" in r && r.error) {
      setError(r.error);
      return;
    }
    if ("url" in r && r.url) {
      window.location.assign(r.url);
      return;
    }
    setError("Could not start checkout.");
  }

  if (sorted.length === 0) {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-3 text-sm text-amber-950 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-100">
        <p className="font-medium">No submission prices loaded</p>
        <p className="mt-2 text-amber-900/90 dark:text-amber-200/90">
          Your database needs the submission tiers. From the project root run{" "}
          <code className="rounded bg-amber-100/80 px-1 py-0.5 font-mono text-xs dark:bg-amber-900/60">
            npx supabase db push
          </code>{" "}
          (or apply migrations in the Supabase dashboard). For local Next.js, add{" "}
          <code className="rounded bg-amber-100/80 px-1 py-0.5 font-mono text-xs dark:bg-amber-900/60">
            SUPABASE_SERVICE_ROLE_KEY
          </code>{" "}
          so the server can read <code className="font-mono text-xs">pricing_plans</code>.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <fieldset className="space-y-3">
        <legend className="sr-only">Choose submission plan</legend>
        {sorted.map((t) => {
          const cur = (t.currency ?? "usd").toUpperCase();
          const price = formatMoney(t.price_cents, cur);
          const isSel = selected?.id === t.id;
          return (
            <label
              key={t.id}
              className={`flex cursor-pointer gap-3 rounded-lg border p-3 text-sm transition-colors ${
                isSel
                  ? "border-zinc-900 bg-zinc-50 dark:border-zinc-100 dark:bg-zinc-900/40"
                  : "border-zinc-200 hover:border-zinc-400 dark:border-zinc-700 dark:hover:border-zinc-500"
              }`}
            >
              <input
                type="radio"
                name="submission_tier"
                className="mt-1"
                checked={isSel}
                onChange={() => setSelectedId(t.id)}
              />
              <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="font-medium text-zinc-900 dark:text-zinc-100">{t.label}</span>
                <span className="text-zinc-600 dark:text-zinc-400">{price}</span>
              </span>
            </label>
          );
        })}
      </fieldset>

      <button
        type="button"
        onClick={() => void onCheckout()}
        disabled={pending || !selected}
        className="inline-flex min-h-11 w-full items-center justify-center rounded-md bg-zinc-900 px-4 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white sm:w-auto"
      >
        {pending
          ? "Redirecting to Stripe…"
          : selected
            ? `Pay ${formatMoney(selected.price_cents, (selected.currency ?? "usd").toUpperCase())} & start upload`
            : "Choose a plan"}
      </button>

      {error ? <p className="text-sm text-red-600 dark:text-red-400">{error}</p> : null}

      <p className="text-xs text-zinc-500 dark:text-zinc-500">
        You will complete checkout on Stripe, then return here to finish your draft.
      </p>
    </div>
  );
}
