import Link from "next/link";
import { AdminActivateCheckoutButton } from "@/components/admin/admin-activate-checkout-button";
import { formatDateTimeDisplay } from "@/lib/format/datetime-display";
import { loadReconcilePaymentRows } from "@/lib/admin/payment-reconciliation";

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

export default async function AdminPaymentsPage() {
  const { rows, error } = await loadReconcilePaymentRows(60);
  const flagged = rows.filter((r) => r.mismatch || r.needsActivation);

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Payment reconciliation</h1>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          Recent submission checkouts: compare Stripe session status to the database. Use{" "}
          <strong>Activate</strong> when Stripe shows paid but the payment is still pending or has no draft track.
        </p>
        <p className="mt-2 text-sm text-zinc-500">
          See also{" "}
          <Link href="/admin/submissions" className="font-medium underline">
            Submissions
          </Link>{" "}
          (paid — awaiting upload) and{" "}
          <Link href="/admin/system" className="font-medium underline">
            System health
          </Link>
          .
        </p>
      </div>

      {error ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
          {error}
        </p>
      ) : null}

      {flagged.length > 0 ? (
        <section className="flex flex-col gap-3">
          <h2 className="text-lg font-semibold tracking-tight text-amber-900 dark:text-amber-100">
            Needs attention ({flagged.length})
          </h2>
          <div className="overflow-x-auto rounded-lg border border-amber-200 dark:border-amber-900/60">
            <table className="w-full min-w-[48rem] text-left text-sm">
              <thead className="border-b border-amber-200 bg-amber-50/80 text-xs uppercase tracking-wide text-zinc-600 dark:border-amber-900 dark:bg-amber-950/30 dark:text-zinc-400">
                <tr>
                  <th className="px-3 py-2">Artist</th>
                  <th className="px-3 py-2">Plan</th>
                  <th className="px-3 py-2">DB</th>
                  <th className="px-3 py-2">Stripe</th>
                  <th className="px-3 py-2">Track</th>
                  <th className="px-3 py-2" />
                </tr>
              </thead>
              <tbody className="divide-y divide-amber-100 dark:divide-amber-900/40">
                {flagged.map((r) => (
                  <tr key={r.paymentId}>
                    <td className="px-3 py-2">{r.artistName}</td>
                    <td className="px-3 py-2">{r.planLabel}</td>
                    <td className="px-3 py-2 font-mono text-xs">{r.dbStatus}</td>
                    <td className="px-3 py-2 font-mono text-xs">
                      {r.stripePaymentStatus ?? "—"}
                      {r.stripePaid ? " ✓" : ""}
                    </td>
                    <td className="px-3 py-2 font-mono text-xs">{r.trackId ? "yes" : "no"}</td>
                    <td className="px-3 py-2">
                      {r.sessionId ? (
                        <AdminActivateCheckoutButton sessionId={r.sessionId} />
                      ) : (
                        <span className="text-xs text-zinc-500">No session id</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold tracking-tight">All recent submission payments</h2>
        {rows.length === 0 ? (
          <p className="text-sm text-zinc-500">No submission payments found.</p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
            <table className="w-full min-w-[52rem] text-left text-sm">
              <thead className="border-b border-zinc-200 bg-zinc-50 text-xs uppercase tracking-wide text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900/50 dark:text-zinc-400">
                <tr>
                  <th className="px-3 py-2">When</th>
                  <th className="px-3 py-2">Artist</th>
                  <th className="px-3 py-2">Amount</th>
                  <th className="px-3 py-2">DB status</th>
                  <th className="px-3 py-2">Stripe</th>
                  <th className="px-3 py-2">Draft</th>
                  <th className="px-3 py-2" />
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {rows.map((r) => (
                  <tr key={r.paymentId} className={r.mismatch ? "bg-amber-50/50 dark:bg-amber-950/20" : undefined}>
                    <td className="px-3 py-2 text-xs text-zinc-500">{formatDateTimeDisplay(r.createdAt)}</td>
                    <td className="px-3 py-2">{r.artistName}</td>
                    <td className="px-3 py-2">{formatMoney(r.amountCents, r.currency)}</td>
                    <td className="px-3 py-2 font-mono text-xs">{r.dbStatus}</td>
                    <td className="px-3 py-2 font-mono text-xs">
                      {r.stripeStatus ?? "—"} / {r.stripePaymentStatus ?? "—"}
                    </td>
                    <td className="px-3 py-2 font-mono text-xs">{r.trackId ? "linked" : "—"}</td>
                    <td className="px-3 py-2">
                      {r.sessionId && (r.needsActivation || r.mismatch) ? (
                        <AdminActivateCheckoutButton sessionId={r.sessionId} />
                      ) : (
                        <span className="text-xs text-zinc-400">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
