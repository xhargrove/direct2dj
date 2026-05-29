import "server-only";

import { getStripeModeFromEnv, stripeEnvModeMismatch } from "@/lib/billing/stripe-mode";
import { isEmailProviderConfigured } from "@/lib/notifications/email";
import { getSiteUrl } from "@/lib/billing/site-url";
import { createServiceRoleClientOrNull } from "@/lib/supabase/service-role";

export type HealthCheck = {
  id: string;
  label: string;
  status: "ok" | "warn" | "fail";
  detail: string;
};

export type SystemHealthReport = {
  checks: HealthCheck[];
  siteUrl: string;
  stripeMode: ReturnType<typeof getStripeModeFromEnv>;
};

export async function loadSystemHealthReport(): Promise<SystemHealthReport> {
  const checks: HealthCheck[] = [];
  const siteUrl = getSiteUrl();

  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  checks.push({
    id: "service_role",
    label: "SUPABASE_SERVICE_ROLE_KEY",
    status: serviceRole ? "ok" : "fail",
    detail: serviceRole
      ? "Set — required for Stripe activation, admin pack uploads, and notification email."
      : "Missing — paid submission checkout cannot create draft tracks; webhooks may not fulfill payments.",
  });

  const explicitSite = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  checks.push({
    id: "site_url",
    label: "NEXT_PUBLIC_SITE_URL",
    status: explicitSite ? "ok" : "warn",
    detail: explicitSite
      ? explicitSite.replace(/\/$/, "")
      : `Not set — using ${siteUrl} (Vercel URL or localhost). Set for production Stripe return URLs.`,
  });

  const webhook = process.env.STRIPE_WEBHOOK_SECRET?.trim();
  checks.push({
    id: "stripe_webhook",
    label: "STRIPE_WEBHOOK_SECRET",
    status: webhook?.startsWith("whsec_") ? "ok" : webhook ? "warn" : "fail",
    detail: webhook
      ? webhook.startsWith("whsec_")
        ? "Set — /api/webhooks/stripe can verify events."
        : "Present but does not look like whsec_…"
      : "Missing — checkout.session.completed events will return 500.",
  });

  const stripeSecret = process.env.STRIPE_SECRET_KEY?.trim() ?? "";
  const stripeMode = getStripeModeFromEnv();
  checks.push({
    id: "stripe_secret",
    label: "STRIPE_SECRET_KEY",
    status: stripeSecret.startsWith("sk_") || stripeSecret.startsWith("rk_") ? "ok" : "fail",
    detail: stripeSecret ? `${stripeMode} mode` : "Missing",
  });

  if (stripeEnvModeMismatch()) {
    checks.push({
      id: "stripe_mode_pair",
      label: "Stripe key pair",
      status: "fail",
      detail: "Secret and publishable keys are different modes (test vs live).",
    });
  }

  const siteIsLocal =
    siteUrl.includes("localhost") || siteUrl.includes("127.0.0.1") || siteUrl.includes("0.0.0.0");
  if (stripeMode === "live" && siteIsLocal) {
    checks.push({
      id: "stripe_live_localhost",
      label: "Stripe + site URL",
      status: "fail",
      detail: "Live Stripe keys with a localhost site URL — checkout return URLs will be wrong.",
    });
  } else if (stripeMode === "live" && process.env.NODE_ENV !== "production") {
    checks.push({
      id: "stripe_live_non_prod",
      label: "Stripe live mode",
      status: "warn",
      detail: "Live Stripe keys on a non-production Node env — real charges possible during local smoke.",
    });
  }

  checks.push({
    id: "email",
    label: "Transactional email",
    status: isEmailProviderConfigured() ? "ok" : "warn",
    detail: isEmailProviderConfigured()
      ? "Provider configured (Resend / SendGrid / Postmark)."
      : "No provider — in-app notifications only; post-pay artist email will not send.",
  });

  const cron = process.env.CRON_SECRET?.trim();
  checks.push({
    id: "cron",
    label: "CRON_SECRET",
    status: cron ? "ok" : "warn",
    detail: cron
      ? "Set — /api/cron/notifications can run on a schedule."
      : "Optional — featured notification sweep cron will 401 without it.",
  });

  const admin = createServiceRoleClientOrNull();
  if (!admin) {
    checks.push({
      id: "db_parity",
      label: "Database parity",
      status: "warn",
      detail: "Cannot probe tables without service role.",
    });
  } else {
    const probes: { table: string; label: string }[] = [
      { table: "admin_broadcasts", label: "admin_broadcasts (DJ messages)" },
      { table: "notifications", label: "notifications" },
      { table: "pricing_plans", label: "pricing_plans" },
    ];

    for (const { table, label } of probes) {
      const { error } = await admin.from(table).select("id").limit(1);
      checks.push({
        id: `table_${table}`,
        label,
        status: error ? "fail" : "ok",
        detail: error
          ? `${error.message} — run npm run db:push against this Supabase project.`
          : "Readable via service role.",
      });
    }
  }

  return { checks, siteUrl, stripeMode };
}
