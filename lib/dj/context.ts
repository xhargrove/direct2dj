import "server-only";

import { copyForAccessState } from "@/lib/auth/account-access-copy";
import { resolveAccountAccessState } from "@/lib/auth/account-access-state";
import { createClient } from "@/lib/supabase/server";
import type { DjVettingStatus } from "@/lib/types/database";
import type { UserRole } from "@/lib/types/roles";

export type DjContextResult =
  | { supabase: Awaited<ReturnType<typeof createClient>>; userId: string; djId: string }
  | { error: string };

/**
 * Any authenticated user with `profiles.role = dj` and a `djs` row.
 * Use for application, settings, and profile updates (pending/rejected/approved).
 */
export async function getDjContext(): Promise<DjContextResult> {
  const supabase = await createClient();
  const {
    data: { user },
    error: authErr,
  } = await supabase.auth.getUser();
  if (authErr || !user) {
    return { error: "Not signed in." };
  }

  const { data: profile, error: profileErr } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  if (profileErr) {
    return { error: "Could not verify your account. Please try again." };
  }
  if ((profile?.role as UserRole | undefined) !== "dj") {
    const artistCopy = copyForAccessState("ARTIST_ACCOUNT");
    return { error: artistCopy?.title ?? "This action is only available to DJ accounts." };
  }

  const { data: dj, error: djErr } = await supabase.from("djs").select("id").eq("profile_id", user.id).maybeSingle();
  if (djErr) {
    return { error: "Could not verify your DJ profile. Please try again." };
  }
  if (!dj) {
    const notStarted = copyForAccessState("DJ_APPLICATION_NOT_STARTED");
    return { error: notStarted?.message ?? "No DJ profile found." };
  }

  return { supabase, userId: user.id, djId: dj.id };
}

/**
 * Approved DJ only — catalog download, preview, ratings, feedback (matches RLS vetting checks).
 */
export async function getApprovedDjCatalogContext(): Promise<DjContextResult> {
  const base = await getDjContext();
  if ("error" in base) return base;

  const { data: dj, error: djErr } = await base.supabase
    .from("djs")
    .select("vetting_status")
    .eq("id", base.djId)
    .maybeSingle();
  if (djErr) {
    return { error: "Could not verify DJ approval status. Please try again." };
  }

  const { data: applicationRow } = await base.supabase
    .from("dj_applications")
    .select("id, dj_id")
    .eq("dj_id", base.djId)
    .maybeSingle();

  const access = resolveAccountAccessState({
    userId: base.userId,
    profile: { id: base.userId, role: "dj", full_name: null, email: null },
    dj: dj ? { id: base.djId, vetting_status: dj.vetting_status as DjVettingStatus } : null,
    djApplication: applicationRow,
    artist: null,
    workspace: "dj",
  });

  if (access.state === "DJ_APPROVED") {
    return base;
  }

  return { error: access.message };
}
