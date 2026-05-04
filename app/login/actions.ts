"use server";

import { revalidatePath } from "next/cache";
import { loginRoleSelectorEnabled } from "@/lib/auth/login-role-selector";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClientOrNull } from "@/lib/supabase/service-role";
import type { UserRole } from "@/lib/types/roles";
import { isUserRole } from "@/lib/types/roles";

/**
 * Applies the chosen role after email/password sign-in. Uses the service role because
 * `profiles_guard_role_change` blocks end users from changing their own role.
 */
export async function applySelectedLoginRole(role: string) {
  if (!loginRoleSelectorEnabled()) {
    return { error: "Role selection is not enabled on this deployment." as const };
  }
  if (!isUserRole(role)) {
    return { error: "Invalid role." as const };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "Not signed in." as const };
  }

  const admin = createServiceRoleClientOrNull();
  if (!admin) {
    return {
      error:
        "SUPABASE_SERVICE_ROLE_KEY is not set. Add it to .env.local (server-only) to use the login role selector." as const,
    };
  }

  const nextRole = role as UserRole;
  const { error: profileErr } = await admin.from("profiles").update({ role: nextRole }).eq("id", user.id);
  if (profileErr) {
    return { error: profileErr.message };
  }

  if (nextRole === "dj") {
    const { data: dj } = await admin.from("djs").select("id").eq("profile_id", user.id).maybeSingle();
    if (dj?.id) {
      await admin.from("djs").update({ vetting_status: "approved" }).eq("id", dj.id);
    }
  }

  revalidatePath("/", "layout");
  return { ok: true as const };
}
