import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { dashboardPathForRole, safeAppPath } from "@/lib/auth/paths";
import type { UserRole } from "@/lib/types/roles";
import { isUserRole } from "@/lib/types/roles";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const nextRaw = searchParams.get("next");

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      let role: UserRole = "artist";
      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", user.id)
          .maybeSingle();
        if (profile?.role && isUserRole(profile.role)) {
          role = profile.role;
        }
      }
      const fallback = dashboardPathForRole(role);
      const next = safeAppPath(nextRaw, fallback);
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth`);
}
