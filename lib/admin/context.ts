import "server-only";
import { createClient } from "@/lib/supabase/server";
import { isBackstageRole, isFullAdminRole } from "@/lib/auth/backstage-access";
import type { UserRole } from "@/lib/types/roles";

type BackstageProfile = { id: string; role: UserRole };

async function loadBackstageProfile() {
  const supabase = await createClient();
  const {
    data: { user },
    error: authErr,
  } = await supabase.auth.getUser();
  if (authErr || !user) {
    return { error: "Not signed in." as const };
  }
  const { data: profile, error: profileErr } = await supabase
    .from("profiles")
    .select("id, role")
    .eq("id", user.id)
    .maybeSingle();
  if (profileErr || !profile || !isBackstageRole(profile.role as UserRole)) {
    return { error: "Forbidden." as const };
  }
  return {
    supabase,
    userId: user.id,
    role: profile.role as UserRole,
    isFullAdmin: isFullAdminRole(profile.role as UserRole),
  };
}

/** Full Backstage admin only (moderation, billing, DJ vetting, etc.). */
export async function getAdminContext() {
  const ctx = await loadBackstageProfile();
  if ("error" in ctx) return ctx;
  if (!ctx.isFullAdmin) {
    return { error: "Forbidden." as const };
  }
  return { supabase: ctx.supabase, userId: ctx.userId };
}

/** Admin or co-admin — DJ pack upload, draft creation, track metadata/files. */
export async function getBackstageUploadContext() {
  return loadBackstageProfile();
}
