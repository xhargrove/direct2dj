import "server-only";

import { createServiceRoleClientOrNull } from "@/lib/supabase/service-role";
import type { NotificationKind } from "@/lib/notifications/types";

function siteUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (explicit) return explicit;
  const vercel = process.env.VERCEL_URL?.trim();
  if (vercel) return vercel.startsWith("http") ? vercel : `https://${vercel}`;
  return "http://localhost:3000";
}

/** True when any supported transactional email env is present; sending remains best-effort. */
export function isEmailProviderConfigured(): boolean {
  return Boolean(
    process.env.RESEND_API_KEY?.trim() ||
      process.env.SENDGRID_API_KEY?.trim() ||
      process.env.POSTMARK_SERVER_TOKEN?.trim(),
  );
}

type EmailPayload = {
  userId: string;
  title: string;
  body: string | null;
  kind: NotificationKind;
};

/**
 * Email-ready hook: loads recipient email and sends when a provider is configured.
 * No-op when no provider — in-app notifications still work.
 */
export async function sendNotificationEmail(payload: EmailPayload): Promise<void> {
  if (!isEmailProviderConfigured()) return;

  const admin = createServiceRoleClientOrNull();
  if (!admin) return;

  const { data: profile } = await admin.from("profiles").select("email").eq("id", payload.userId).maybeSingle();

  const to = profile?.email?.trim();
  if (!to) return;

  const subject = payload.title;
  const text = [payload.body, ``, `Open: ${siteUrl()}`].filter(Boolean).join("\n");

  const resend = process.env.RESEND_API_KEY?.trim();
  if (resend) {
    const from = process.env.RESEND_FROM_EMAIL?.trim() || "Digital Service Pack <onboarding@resend.dev>";
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resend}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [to],
        subject,
        text,
        tags: [{ name: "kind", value: payload.kind }],
      }),
    }).catch(() => {});
    return;
  }

  const sendgrid = process.env.SENDGRID_API_KEY?.trim();
  if (sendgrid) {
    const from = process.env.SENDGRID_FROM_EMAIL?.trim();
    if (!from) return;
    await fetch("https://api.sendgrid.com/v3/mail/send", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${sendgrid}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        personalizations: [{ to: [{ email: to }] }],
        from: { email: from },
        subject,
        content: [{ type: "text/plain", value: text }],
      }),
    }).catch(() => {});
    return;
  }

  const postmark = process.env.POSTMARK_SERVER_TOKEN?.trim();
  if (postmark) {
    const from = process.env.POSTMARK_FROM_EMAIL?.trim();
    if (!from) return;
    await fetch("https://api.postmarkapp.com/email", {
      method: "POST",
      headers: {
        "X-Postmark-Server-Token": postmark,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        From: from,
        To: to,
        Subject: subject,
        TextBody: text,
        Tag: payload.kind,
      }),
    }).catch(() => {});
  }
}
