"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  ADMIN_WORKSPACE_ESCAPE_COOKIE,
  adminWorkspaceTestEnabled,
  getAdminWorkspaceTestSecret,
  signWorkspaceEscapeToken,
  verifyWorkspaceEscapeToken,
  workspaceEscapeTtlSec,
} from "@/lib/auth/admin-workspace-test";
import { dashboardPathForRole } from "@/lib/auth/paths";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClientOrNull } from "@/lib/supabase/service-role";
import type { UserRole } from "@/lib/types/roles";
import { isUserRole } from "@/lib/types/roles";

async function approveDjForProfile(supabase: Awaited<ReturnType<typeof createClient>>, profileId: string) {
  const { error } = await supabase
    .from("djs")
    .update({ vetting_status: "approved" })
    .eq("profile_id", profileId);
  return error;
}

async function readEscapeSessionUser(): Promise<
  | { ok: true; userId: string }
  | { ok: false; error: string }
> {
  if (!adminWorkspaceTestEnabled()) {
    return { ok: false, error: "Workspace testing is not enabled on this deployment." };
  }
  const secret = getAdminWorkspaceTestSecret();
  if (!secret) {
    return {
      ok: false,
      error:
        "Set ADMIN_WORKSPACE_TEST_SECRET (recommended for production) or run in development to use workspace testing.",
    };
  }
  const cookieStore = await cookies();
  const raw = cookieStore.get(ADMIN_WORKSPACE_ESCAPE_COOKIE)?.value;
  if (!raw) {
    return { ok: false, error: "No active admin workspace escape session." };
  }
  const parsed = verifyWorkspaceEscapeToken(raw, secret);
  if (!parsed) {
    return { ok: false, error: "Invalid workspace escape token." };
  }
  if (parsed.exp < Math.floor(Date.now() / 1000)) {
    return { ok: false, error: "Workspace escape session expired. Sign in as admin again from /login." };
  }
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || user.id !== parsed.sub) {
    return { ok: false, error: "Session does not match workspace escape token." };
  }
  return { ok: true, userId: user.id };
}

/**
 * While signed in as admin: change `profiles.role` to test Artist or DJ flows. Sets a
 * signed cookie so you can return to admin without being locked out (restore uses service role).
 */
export async function beginAdminWorkspaceTest(role: string) {
  if (!isUserRole(role) || role === "admin") {
    return { error: "Choose artist or dj to test that workspace." as const };
  }
  if (!adminWorkspaceTestEnabled()) {
    return { error: "Workspace testing is not enabled on this deployment." as const };
  }
  const secret = getAdminWorkspaceTestSecret();
  if (!secret) {
    return {
      error:
        "Set ADMIN_WORKSPACE_TEST_SECRET for production, or use next dev (see lib/auth/admin-workspace-test.ts)." as const,
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "Not signed in." as const };
  }

  const { data: profile, error: profileErr } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  if (profileErr || !profile || profile.role !== "admin") {
    return { error: "Only admins can start a workspace test from Backstage." as const };
  }

  const nextRole = role as UserRole;
  const { error: upErr } = await supabase.from("profiles").update({ role: nextRole }).eq("id", user.id);
  if (upErr) {
    return { error: upErr.message };
  }

  if (nextRole === "dj") {
    const djApproveErr = await approveDjForProfile(supabase, user.id);
    if (djApproveErr) {
      const svc = createServiceRoleClientOrNull();
      if (!svc) {
        return {
          error: `Could not approve DJ for catalog testing (${djApproveErr.message}). Set SUPABASE_SERVICE_ROLE_KEY or retry.`,
        };
      }
      const { error: svcErr } = await svc.from("djs").update({ vetting_status: "approved" }).eq("profile_id", user.id);
      if (svcErr) {
        return { error: `Could not approve DJ for catalog testing: ${svcErr.message}` };
      }
    }
  }

  const cookieStore = await cookies();
  cookieStore.set(ADMIN_WORKSPACE_ESCAPE_COOKIE, signWorkspaceEscapeToken(user.id, secret), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: workspaceEscapeTtlSec(),
    secure: process.env.NODE_ENV === "production",
  });

  revalidatePath("/", "layout");
  redirect(dashboardPathForRole(nextRole));
}

/**
 * While in a workspace test (escape cookie valid): switch between artist and DJ using service role.
 */
export async function workspaceTestSwitchPersona(role: string) {
  if (role !== "artist" && role !== "dj") {
    return { error: "Only artist or dj can be selected." as const };
  }
  const gate = await readEscapeSessionUser();
  if (!gate.ok) {
    return { error: gate.error };
  }
  const admin = createServiceRoleClientOrNull();
  if (!admin) {
    return { error: "SUPABASE_SERVICE_ROLE_KEY is required to switch persona during a workspace test." as const };
  }

  const { error: upErr } = await admin.from("profiles").update({ role }).eq("id", gate.userId);
  if (upErr) {
    return { error: upErr.message };
  }

  if (role === "dj") {
    const { error: djErr } = await admin.from("djs").update({ vetting_status: "approved" }).eq("profile_id", gate.userId);
    if (djErr) {
      return { error: djErr.message };
    }
  }

  revalidatePath("/", "layout");
  redirect(dashboardPathForRole(role as UserRole));
}

export async function workspaceTestSwitchToArtist() {
  return workspaceTestSwitchPersona("artist");
}

export async function workspaceTestSwitchToDj() {
  return workspaceTestSwitchPersona("dj");
}

/** Restore admin role and clear the escape cookie. */
export async function exitAdminWorkspaceTest() {
  const gate = await readEscapeSessionUser();
  if (!gate.ok) {
    return { error: gate.error };
  }

  const admin = createServiceRoleClientOrNull();
  if (!admin) {
    return {
      error:
        "SUPABASE_SERVICE_ROLE_KEY is not set. Add it to .env.local so you can restore your admin role after a workspace test." as const,
    };
  }

  const { error: upErr } = await admin.from("profiles").update({ role: "admin" }).eq("id", gate.userId);
  if (upErr) {
    return { error: upErr.message };
  }

  const cookieStore = await cookies();
  cookieStore.delete(ADMIN_WORKSPACE_ESCAPE_COOKIE);

  revalidatePath("/", "layout");
  redirect("/admin/dashboard");
}
