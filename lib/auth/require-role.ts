import "server-only";
import { redirect } from "next/navigation";
import { authGetUserOrTimeout } from "@/lib/supabase/auth-bounded";
import { createClient } from "@/lib/supabase/server";
import { maybeSingleTimeoutFallback } from "@/lib/supabase/maybe-single-timeout-fallback";
import { withTimeout } from "@/lib/supabase/with-timeout";
import { dashboardPathForRole } from "@/lib/auth/paths";
import type { Profile } from "@/lib/types/database";
import type { UserRole } from "@/lib/types/roles";
import { isUserRole } from "@/lib/types/roles";

type GateProfile = Pick<Profile, "id" | "role" | "full_name" | "email">;

export async function requireRoles(allowed: readonly UserRole[]) {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await authGetUserOrTimeout(supabase);

  if (userError || !user) {
    redirect("/login");
  }

  const profileRow = await withTimeout(
    supabase.from("profiles").select("id, role, full_name, email").eq("id", user.id).maybeSingle(),
    5000,
    maybeSingleTimeoutFallback<GateProfile>(),
  );

  const profile = profileRow.data as GateProfile | null;
  const profileError = profileRow.error;

  if (profileError || !profile) {
    redirect("/login");
  }

  if (!allowed.includes(profile.role)) {
    const next =
      isUserRole(profile.role) ? dashboardPathForRole(profile.role) : "/login";
    redirect(next);
  }

  return { user, profile };
}
