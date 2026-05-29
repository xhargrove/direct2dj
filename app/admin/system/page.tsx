import Link from "next/link";
import { loadSystemHealthReport, type HealthCheck } from "@/lib/admin/system-health";

function statusStyles(status: HealthCheck["status"]) {
  if (status === "ok") return "border-emerald-200 bg-emerald-50/80 dark:border-emerald-900 dark:bg-emerald-950/30";
  if (status === "warn") return "border-amber-200 bg-amber-50/80 dark:border-amber-900 dark:bg-amber-950/30";
  return "border-red-200 bg-red-50/80 dark:border-red-900 dark:bg-red-950/30";
}

function statusLabel(status: HealthCheck["status"]) {
  if (status === "ok") return "OK";
  if (status === "warn") return "Warn";
  return "Fail";
}

export default async function AdminSystemPage() {
  const { checks, siteUrl, stripeMode } = await loadSystemHealthReport();
  const failCount = checks.filter((c) => c.status === "fail").length;
  const warnCount = checks.filter((c) => c.status === "warn").length;

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">System health</h1>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          Production readiness for billing, webhooks, and migrations. Canonical URL in use:{" "}
          <span className="font-mono text-xs">{siteUrl}</span>
          {" · "}
          Stripe: <span className="font-mono text-xs">{stripeMode}</span>
        </p>
        <p className="mt-2 text-sm text-zinc-500">
          See repo docs <code className="text-xs">docs/ENV_DEPLOYMENT_CHECKLIST.md</code> and{" "}
          <code className="text-xs">docs/PRODUCTION_SMOKE_TEST_PLAN.md</code>. Redeploy after env changes, then
          re-run smoke tests.
        </p>
      </div>

      <div className="flex flex-wrap gap-3 text-sm">
        <span className="rounded-full border border-red-200 px-3 py-1 dark:border-red-900">
          {failCount} failing
        </span>
        <span className="rounded-full border border-amber-200 px-3 py-1 dark:border-amber-900">
          {warnCount} warnings
        </span>
        <Link href="/admin/payments" className="font-medium underline">
          Payment reconciliation →
        </Link>
      </div>

      <ul className="flex flex-col gap-3">
        {checks.map((c) => (
          <li
            key={c.id}
            className={`rounded-lg border px-4 py-3 ${statusStyles(c.status)}`}
          >
            <div className="flex items-start justify-between gap-3">
              <span className="font-medium">{c.label}</span>
              <span className="shrink-0 text-xs font-semibold uppercase tracking-wide text-zinc-600 dark:text-zinc-400">
                {statusLabel(c.status)}
              </span>
            </div>
            <p className="mt-1 text-sm text-zinc-700 dark:text-zinc-300">{c.detail}</p>
          </li>
        ))}
      </ul>

      <section className="rounded-lg border border-zinc-200 px-4 py-4 text-sm dark:border-zinc-800">
        <h2 className="font-semibold">Operator checklist</h2>
        <ol className="mt-3 list-decimal space-y-2 pl-5 text-zinc-700 dark:text-zinc-300">
          <li>Set <code className="text-xs">SUPABASE_SERVICE_ROLE_KEY</code> and{" "}
            <code className="text-xs">NEXT_PUBLIC_SITE_URL</code> on Production, then redeploy.</li>
          <li>Run <code className="text-xs">npm run db:push</code> against the production Supabase project.</li>
          <li>Confirm Stripe webhook points to <code className="text-xs">/api/webhooks/stripe</code> with signing secret set.</li>
          <li>Smoke-test paid submission: pay → complete page → upload → submit → appears under Pending submissions.</li>
        </ol>
      </section>
    </div>
  );
}
