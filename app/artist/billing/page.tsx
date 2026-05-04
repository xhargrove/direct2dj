import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

type PaymentRow = {
  id: string;
  status: string;
  amount_cents: number;
  currency: string;
  created_at: string;
  stripe_checkout_session_id: string | null;
  tracks: { title: string | null } | { title: string | null }[] | null;
  pricing_plans: { label: string | null; duration_days: number | null } | { label: string | null; duration_days: number | null }[] | null;
};

function firstRel<T>(rel: T | T[] | null | undefined): T | null {
  if (rel == null) return null;
  return Array.isArray(rel) ? rel[0] ?? null : rel;
}

function formatMoney(cents: number, currency: string) {
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: currency.toUpperCase(),
    }).format(cents / 100);
  } catch {
    return `$${(cents / 100).toFixed(2)}`;
  }
}

type Props = { searchParams: Promise<{ checkout?: string }> };

export default async function ArtistBillingPage({ searchParams }: Props) {
  const sp = await searchParams;
  const checkoutOk = sp.checkout === "success";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let rows: PaymentRow[] = [];
  if (user) {
    const { data: artist } = await supabase.from("artists").select("id").eq("profile_id", user.id).maybeSingle();
    if (artist) {
      const { data } = await supabase
        .from("payments")
        .select(
          `
          id,
          status,
          amount_cents,
          currency,
          created_at,
          stripe_checkout_session_id,
          tracks ( title ),
          pricing_plans ( label, duration_days )
        `,
        )
        .eq("artist_id", artist.id)
        .order("created_at", { ascending: false })
        .limit(100);
      rows = (data ?? []) as PaymentRow[];
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Billing</h1>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          Checkout sessions and payment status for DJ feed promotions.
        </p>
      </div>

      {checkoutOk ? (
        <p className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-100">
          Thanks — when Stripe confirms payment, your featured window activates automatically (usually within seconds).
        </p>
      ) : null}

      {rows.length === 0 ? (
        <p className="text-sm text-zinc-500">
          No payments yet.{" "}
          <Link href="/artist/promote" className="underline underline-offset-4">
            Promote a track
          </Link>
          .
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {rows.map((r) => {
            const tr = firstRel(r.tracks);
            const pl = firstRel(r.pricing_plans);
            return (
            <li
              key={r.id}
              className="rounded-lg border border-zinc-200 px-4 py-3 text-sm dark:border-zinc-800"
            >
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <span className="font-medium">{tr?.title?.trim() || "Track"}</span>
                <span className="tabular-nums text-zinc-900 dark:text-zinc-100">
                  {formatMoney(r.amount_cents, r.currency)}
                </span>
              </div>
              <div className="mt-1 text-xs text-zinc-500">
                {pl?.label ?? "Plan"} · {pl?.duration_days ?? "—"} days · Status:{" "}
                <span className="font-medium text-zinc-700 dark:text-zinc-300">{r.status}</span>
              </div>
              <div className="mt-1 text-xs text-zinc-400">
                {new Date(r.created_at).toLocaleString()}
                {r.stripe_checkout_session_id ? ` · ${r.stripe_checkout_session_id.slice(0, 12)}…` : ""}
              </div>
            </li>
            );
          })}
        </ul>
      )}

      <p className="text-xs text-zinc-500">
        Questions about charges appear here as reported by Stripe. Failed payments never create featured placements.
      </p>
    </div>
  );
}
