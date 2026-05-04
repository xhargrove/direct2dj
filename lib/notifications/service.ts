import "server-only";

import { createServiceRoleClientOrNull } from "@/lib/supabase/service-role";
import { sendNotificationEmail } from "@/lib/notifications/email";
import type { NotificationKind } from "@/lib/notifications/types";

export type EmitNotificationInput = {
  userId: string;
  kind: NotificationKind;
  title: string;
  body: string | null;
  metadata?: Record<string, unknown>;
};

/** Inserts in-app rows (service role) and optionally sends email when configured. */
export async function emitNotifications(rows: EmitNotificationInput[]): Promise<void> {
  if (rows.length === 0) return;

  const admin = createServiceRoleClientOrNull();
  if (!admin) return;

  const { error } = await admin.from("notifications").insert(
    rows.map((r) => ({
      user_id: r.userId,
      kind: r.kind,
      title: r.title,
      body: r.body,
      metadata: r.metadata ?? {},
    })),
  );

  if (error) {
    console.error("[notifications] insert failed:", error.message);
    return;
  }

  await Promise.all(
    rows.map((r) =>
      sendNotificationEmail({
        userId: r.userId,
        title: r.title,
        body: r.body,
        kind: r.kind,
      }),
    ),
  );
}

export async function emitNotification(row: EmitNotificationInput): Promise<void> {
  await emitNotifications([row]);
}
