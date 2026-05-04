"use client";

import { useActionState } from "react";
import { startFeaturedCheckoutForm } from "@/app/artist/promote/actions";

type Plan = {
  id: string;
  label: string;
  duration_days: number;
  price_cents: number;
  currency: string;
};

function formatMoney(cents: number, currency: string) {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(cents / 100);
}

export function PlanCheckoutForms({ trackId, plans }: { trackId: string; plans: Plan[] }) {
  return (
    <div className="flex flex-col gap-4">
      {plans.map((plan) => (
        <PlanRow key={plan.id} trackId={trackId} plan={plan} />
      ))}
    </div>
  );
}

function PlanRow({ trackId, plan }: { trackId: string; plan: Plan }) {
  const [state, formAction, pending] = useActionState(startFeaturedCheckoutForm, null);
  const cur = (plan.currency ?? "usd").toLowerCase();

  return (
    <form
      action={formAction}
      className="flex flex-col gap-3 rounded-lg border border-zinc-200 p-4 dark:border-zinc-800 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between"
    >
      <input type="hidden" name="trackId" value={trackId} />
      <input type="hidden" name="pricingPlanId" value={plan.id} />
      <div className="min-w-0 flex-1">
        <div className="font-medium">{plan.label}</div>
        <div className="text-xs text-zinc-500">{plan.duration_days} days at the top of the DJ feed</div>
      </div>
      <button
        type="submit"
        disabled={pending}
        className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-md bg-zinc-900 px-4 text-sm font-medium text-white disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900"
      >
        {pending ? "Redirecting…" : `Pay ${formatMoney(plan.price_cents, cur)}`}
      </button>
      {state?.error ? (
        <p className="w-full text-sm text-red-600 dark:text-red-400">{state.error}</p>
      ) : null}
    </form>
  );
}
