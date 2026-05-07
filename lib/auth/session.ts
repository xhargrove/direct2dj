import "server-only";

import { authGetUserOrTimeout } from "@/lib/supabase/auth-bounded";
import { createClient } from "@/lib/supabase/server";
import { maybeSingleTimeoutFallback } from "@/lib/supabase/maybe-single-timeout-fallback";
import { withTimeout } from "@/lib/supabase/with-timeout";
import { dashboardPathForRole } from "@/lib/auth/paths";
import { isUserRole } from "@/lib/types/roles";

/** When signed in with a valid profile role, returns the role home path; otherwise null. */
export async function getRoleDashboardPath(): Promise<string | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await authGetUserOrTimeout(supabase);
  if (!user) return null;

  const profileRow = await withTimeout(
    supabase.from("profiles").select("role").eq("id", user.id).maybeSingle(),
    4000,
    maybeSingleTimeoutFallback<{ role: string }>(),
  );
  const profile = profileRow.data;

  if (!profile?.role || !isUserRole(profile.role)) return null;
  return dashboardPathForRole(profile.role);
}
