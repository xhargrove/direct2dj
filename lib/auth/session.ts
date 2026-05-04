import "server-only";

import { createClient } from "@/lib/supabase/server";
import { dashboardPathForRole } from "@/lib/auth/paths";
import { isUserRole } from "@/lib/types/roles";

/** When signed in with a valid profile role, returns the role home path; otherwise null. */
export async function getRoleDashboardPath(): Promise<string | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile?.role || !isUserRole(profile.role)) return null;
  return dashboardPathForRole(profile.role);
}
