"use server";

import { revalidatePath } from "next/cache";
import { getAdminContext } from "@/lib/admin/context";
import {
  sendAdminDjAnnouncement,
  type AdminBroadcastAudience,
} from "@/lib/notifications/admin-broadcast";

export async function sendDjAnnouncementAction(formData: FormData) {
  const ctx = await getAdminContext();
  if ("error" in ctx) return { error: ctx.error };

  const audience = formData.get("audience") as AdminBroadcastAudience | null;
  if (audience !== "all_approved_djs" && audience !== "single_dj") {
    return { error: "Choose who receives this message." };
  }

  const title = String(formData.get("title") ?? "");
  const bodyRaw = formData.get("body");
  const body = typeof bodyRaw === "string" ? bodyRaw : null;
  const hrefRaw = formData.get("href");
  const href = typeof hrefRaw === "string" ? hrefRaw : null;
  const targetDjIdRaw = formData.get("target_dj_id");
  const targetDjId = typeof targetDjIdRaw === "string" ? targetDjIdRaw : null;

  const result = await sendAdminDjAnnouncement({
    adminUserId: ctx.userId,
    title,
    body,
    href,
    audience,
    targetDjId: audience === "single_dj" ? targetDjId : null,
  });

  if ("error" in result) return { error: result.error };

  revalidatePath("/admin/communications");
  return {
    ok: true as const,
    recipientCount: result.recipientCount,
    broadcastId: result.broadcastId,
  };
}
