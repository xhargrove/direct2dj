"use server";

import { revalidatePath } from "next/cache";
import { getAdminContext } from "@/lib/admin/context";
import { dashboardPathForRole } from "@/lib/auth/paths";
import { emitNotification } from "@/lib/notifications/service";
import {
  sendAdminDjAnnouncement,
  type AdminBroadcastAudience,
} from "@/lib/notifications/admin-broadcast";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import type { UserRole } from "@/lib/types/roles";

const OUTREACH_ROLES = ["artist", "dj"] as const satisfies readonly UserRole[];

export async function sendUserOutreachAction(formData: FormData) {
  const ctx = await getAdminContext();
  if ("error" in ctx) return { error: ctx.error };

  const audience = formData.get("audience") as AdminBroadcastAudience | null;
  const allowed: AdminBroadcastAudience[] = [
    "all_approved_djs",
    "single_dj",
    "pending_djs",
    "single_profile",
  ];
  if (!audience || !allowed.includes(audience)) {
    return { error: "Choose who receives this message." };
  }

  const title = String(formData.get("title") ?? "");
  const bodyRaw = formData.get("body");
  const body = typeof bodyRaw === "string" ? bodyRaw : null;
  const hrefRaw = formData.get("href");
  const href = typeof hrefRaw === "string" ? hrefRaw : null;
  const targetDjIdRaw = formData.get("target_dj_id");
  const targetDjId = typeof targetDjIdRaw === "string" ? targetDjIdRaw : null;
  const targetProfileIdRaw = formData.get("target_profile_id");
  const targetProfileId = typeof targetProfileIdRaw === "string" ? targetProfileIdRaw : null;

  const result = await sendAdminDjAnnouncement({
    adminUserId: ctx.userId,
    title,
    body,
    href,
    audience,
    targetDjId: audience === "single_dj" ? targetDjId : null,
    targetProfileId: audience === "single_profile" ? targetProfileId : null,
  });

  if ("error" in result) return { error: result.error };

  revalidatePath("/admin/user-outreach");
  revalidatePath("/admin/communications");
  return {
    ok: true as const,
    recipientCount: result.recipientCount,
    broadcastId: result.broadcastId,
  };
}

export async function adminSetUserRoleAndNotify(input: {
  profileId: string;
  role: (typeof OUTREACH_ROLES)[number];
  title: string;
  body: string;
  href?: string | null;
}) {
  const ctx = await getAdminContext();
  if ("error" in ctx) return { error: ctx.error };

  const profileId = input.profileId.trim();
  const role = input.role;
  if (!profileId) return { error: "User is required." };
  if (!OUTREACH_ROLES.includes(role)) return { error: "Role must be artist or DJ." };

  const title = input.title.trim();
  const body = input.body.trim();
  if (!title) return { error: "Title is required." };
  if (!body) return { error: "Message is required." };

  let admin;
  try {
    admin = createServiceRoleClient();
  } catch {
    return { error: "SUPABASE_SERVICE_ROLE_KEY is required to change user roles." };
  }

  const { data: profile, error: findErr } = await admin
    .from("profiles")
    .select("id, role, email")
    .eq("id", profileId)
    .maybeSingle();

  if (findErr) return { error: findErr.message };
  if (!profile) return { error: "User not found." };
  if (profile.role === "admin" || profile.role === "co_admin" || profile.role === "label_rep") {
    return { error: "Cannot change role for this account type." };
  }

  if (profile.role !== role) {
    const { error: upErr } = await admin.from("profiles").update({ role, updated_at: new Date().toISOString() }).eq("id", profileId);
    if (upErr) return { error: upErr.message };
  }

  const href = input.href?.trim() || dashboardPathForRole(role);

  await emitNotification({
    userId: profileId,
    kind: "admin_account_notice",
    title,
    body,
    metadata: { href },
  });

  revalidatePath("/admin/user-outreach");
  revalidatePath("/admin/dj-applications");
  revalidatePath("/admin/djs");
  revalidatePath("/admin/artists");
  return { ok: true as const };
}

export async function lookupProfileByEmail(emailRaw: string) {
  const ctx = await getAdminContext();
  if ("error" in ctx) return { error: ctx.error };

  const email = emailRaw.trim().toLowerCase();
  if (!email || !email.includes("@")) return { error: "Enter a valid email." };

  let admin;
  try {
    admin = createServiceRoleClient();
  } catch {
    return { error: "SUPABASE_SERVICE_ROLE_KEY is required to look up users." };
  }

  const { data: profile, error } = await admin
    .from("profiles")
    .select("id, email, full_name, role, created_at")
    .ilike("email", email)
    .maybeSingle();

  if (error) return { error: error.message };
  if (!profile) return { error: "No account found for that email." };

  const { data: dj } = await admin
    .from("djs")
    .select("id, display_name, vetting_status")
    .eq("profile_id", profile.id)
    .maybeSingle();

  const { data: artist } = await admin
    .from("artists")
    .select("id, display_name")
    .eq("profile_id", profile.id)
    .maybeSingle();

  return {
    ok: true as const,
    profile,
    dj: dj ?? null,
    artist: artist ?? null,
  };
}
