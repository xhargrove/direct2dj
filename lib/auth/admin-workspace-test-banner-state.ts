import "server-only";

import { cookies } from "next/headers";
import {
  ADMIN_WORKSPACE_ESCAPE_COOKIE,
  adminWorkspaceTestEnabled,
  getAdminWorkspaceTestSecret,
  verifyWorkspaceEscapeToken,
} from "@/lib/auth/admin-workspace-test";
import { createClient } from "@/lib/supabase/server";

export type AdminWorkspaceTestBannerState =
  | { show: false }
  | { show: true; role: "artist" | "dj" };

export async function getAdminWorkspaceTestBannerState(): Promise<AdminWorkspaceTestBannerState> {
  if (!adminWorkspaceTestEnabled()) return { show: false };
  const secret = getAdminWorkspaceTestSecret();
  if (!secret) return { show: false };

  const cookieStore = await cookies();
  const raw = cookieStore.get(ADMIN_WORKSPACE_ESCAPE_COOKIE)?.value;
  if (!raw) return { show: false };

  const parsed = verifyWorkspaceEscapeToken(raw, secret);
  if (!parsed || parsed.exp < Math.floor(Date.now() / 1000)) return { show: false };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || user.id !== parsed.sub) return { show: false };

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (profile?.role !== "artist" && profile?.role !== "dj") return { show: false };

  return { show: true, role: profile.role };
}
