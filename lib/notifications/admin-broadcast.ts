import "server-only";

import { safeAppPath } from "@/lib/auth/paths";
import { emitNotifications } from "@/lib/notifications/service";
import type { NotificationKind } from "@/lib/notifications/types";
import { createServiceRoleClientOrNull } from "@/lib/supabase/service-role";

const NOTIFY_CHUNK = 150;
const MAX_TITLE_LEN = 120;
const MAX_BODY_LEN = 2000;

export type AdminBroadcastAudience = "all_approved_djs" | "single_dj";

export type SendAdminDjAnnouncementInput = {
  adminUserId: string;
  title: string;
  body: string | null;
  href: string | null;
  audience: AdminBroadcastAudience;
  targetDjId?: string | null;
};

export type SendAdminDjAnnouncementResult =
  | { ok: true; broadcastId: string; recipientCount: number }
  | { error: string };

function normalizeHref(href: string | null | undefined): string | null {
  const trimmed = href?.trim();
  if (!trimmed) return null;
  return safeAppPath(trimmed, "");
}

function normalizeTitle(title: string): string | null {
  const t = title.trim();
  if (!t) return null;
  if (t.length > MAX_TITLE_LEN) return t.slice(0, MAX_TITLE_LEN);
  return t;
}

function normalizeBody(body: string | null | undefined): string | null {
  if (body == null) return null;
  const b = body.trim();
  if (!b) return null;
  if (b.length > MAX_BODY_LEN) return b.slice(0, MAX_BODY_LEN);
  return b;
}

async function resolveRecipientProfileIds(
  admin: NonNullable<ReturnType<typeof createServiceRoleClientOrNull>>,
  audience: AdminBroadcastAudience,
  targetDjId: string | null | undefined,
): Promise<{ profileIds: string[]; targetDjId: string | null } | { error: string }> {
  if (audience === "single_dj") {
    const djId = targetDjId?.trim();
    if (!djId) return { error: "Choose a DJ for a single-DJ message." };

    const { data: dj, error } = await admin
      .from("djs")
      .select("id, profile_id")
      .eq("id", djId)
      .maybeSingle();

    if (error) return { error: error.message };
    if (!dj?.profile_id) return { error: "DJ not found." };

    return { profileIds: [dj.profile_id], targetDjId: dj.id };
  }

  const { data: djRows, error } = await admin
    .from("djs")
    .select("profile_id")
    .eq("vetting_status", "approved");

  if (error) return { error: error.message };

  const profileIds = [
    ...new Set((djRows ?? []).map((r) => r.profile_id).filter((id): id is string => typeof id === "string")),
  ];

  if (profileIds.length === 0) return { error: "No approved DJs to notify." };

  return { profileIds, targetDjId: null };
}

/** Backstage-only: fan-out in-app notifications to approved DJs or one DJ. */
export async function sendAdminDjAnnouncement(
  input: SendAdminDjAnnouncementInput,
): Promise<SendAdminDjAnnouncementResult> {
  const title = normalizeTitle(input.title);
  if (!title) return { error: "Title is required." };

  const body = normalizeBody(input.body);
  const href = normalizeHref(input.href);
  if (input.href?.trim() && !href) {
    return { error: "Link must be an in-app path starting with / (no query or hash)." };
  }

  const admin = createServiceRoleClientOrNull();
  if (!admin) {
    return { error: "Server is missing SUPABASE_SERVICE_ROLE_KEY; cannot send announcements." };
  }

  const recipients = await resolveRecipientProfileIds(admin, input.audience, input.targetDjId);
  if ("error" in recipients) return { error: recipients.error };

  const kind: NotificationKind =
    input.audience === "single_dj" ? "admin_message" : "admin_announcement";

  const { data: broadcast, error: insErr } = await admin
    .from("admin_broadcasts")
    .insert({
      created_by: input.adminUserId,
      title,
      body,
      href,
      audience: input.audience,
      target_dj_id: recipients.targetDjId,
      recipient_count: 0,
    })
    .select("id")
    .single();

  if (insErr || !broadcast?.id) {
    return { error: insErr?.message ?? "Could not record announcement." };
  }

  const broadcastId = broadcast.id as string;
  const metadataBase: Record<string, unknown> = {
    broadcast_id: broadcastId,
    ...(href ? { href } : {}),
  };

  for (let i = 0; i < recipients.profileIds.length; i += NOTIFY_CHUNK) {
    const slice = recipients.profileIds.slice(i, i + NOTIFY_CHUNK);
    await emitNotifications(
      slice.map((userId) => ({
        userId,
        kind,
        title,
        body,
        metadata: { ...metadataBase },
      })),
    );
  }

  const recipientCount = recipients.profileIds.length;

  const { error: updErr } = await admin
    .from("admin_broadcasts")
    .update({ recipient_count: recipientCount })
    .eq("id", broadcastId);

  if (updErr) {
    console.error("[admin-broadcast] recipient_count update failed:", updErr.message);
  }

  return { ok: true, broadcastId, recipientCount };
}
