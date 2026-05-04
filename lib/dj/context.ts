import "server-only";
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
    return { error: profileErr.message };
  }
  if ((profile?.role as UserRole | undefined) !== "dj") {
    return { error: "This action is only available to DJ accounts." };
  }

  const { data: dj, error: djErr } = await supabase.from("djs").select("id").eq("profile_id", user.id).maybeSingle();
  if (djErr) {
    return { error: djErr.message };
  }
  if (!dj) {
    return { error: "No DJ profile found." };
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
    return { error: djErr.message };
  }

  const status = dj?.vetting_status as DjVettingStatus | undefined;
  if (status === "pending") {
    return { error: "Your DJ application is still pending. You cannot use the catalog until approved." };
  }
  if (status === "rejected") {
    return { error: "Your DJ application was not approved for the promo pool." };
  }
  if (status === "suspended") {
    return { error: "Your DJ account is suspended. Catalog access is disabled." };
  }
  if (status !== "approved") {
    return { error: "You are not approved to use the DJ catalog." };
  }

  return base;
}
