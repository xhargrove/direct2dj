import "server-only";

import { authGetUserOrTimeout } from "@/lib/supabase/auth-bounded";
import { maybeSingleTimeoutFallback } from "@/lib/supabase/maybe-single-timeout-fallback";
import { createClient } from "@/lib/supabase/server";
import { withTimeout } from "@/lib/supabase/with-timeout";
import {
  resolveAccountAccessState,
  type AccountAccessResult,
} from "@/lib/auth/account-access-state";
import type { Artist, Dj, DjApplication, Profile } from "@/lib/types/database";

type GateProfile = Pick<Profile, "id" | "role" | "full_name" | "email">;
type GateDj = Pick<Dj, "id" | "vetting_status">;
type GateApplication = Pick<DjApplication, "id" | "dj_id">;
type GateArtist = Pick<Artist, "id">;

function logAccessAnomaly(message: string, details: Record<string, unknown>) {
  console.error(`[account-access] ${message}`, details);
}

/**
 * Loads profile, DJ row, application, and artist data from Supabase, then resolves access state.
 */
export async function resolveDjWorkspaceAccess(): Promise<AccountAccessResult> {
  const supabase = await createClient();
  const {
    data: { user },
    error: authErr,
  } = await authGetUserOrTimeout(supabase);

  if (!user) {
    if (authErr) {
      logAccessAnomaly("auth getUser failed without session", { error: authErr.message });
    }
    return resolveAccountAccessState({
      userId: null,
      profile: null,
      dj: null,
      djApplication: null,
      artist: null,
      workspace: "dj",
    });
  }

  if (authErr) {
    logAccessAnomaly("auth getUser failed with session", { userId: user.id, error: authErr.message });
  }

  const profileRow = await withTimeout(
    supabase.from("profiles").select("id, role, full_name, email").eq("id", user.id).maybeSingle(),
    5000,
    maybeSingleTimeoutFallback<GateProfile>(),
  );

  if (profileRow.error) {
    logAccessAnomaly("profile query failed", { userId: user.id, error: profileRow.error.message });
    return resolveAccountAccessState({
      userId: user.id,
      profile: null,
      dj: null,
      djApplication: null,
      artist: null,
      workspace: "dj",
      queryError: profileRow.error.message,
    });
  }

  const profile = profileRow.data as GateProfile | null;
  if (!profile) {
    logAccessAnomaly("signed-in user has no profile", { userId: user.id });
  }

  let artist: GateArtist | null = null;
  let dj: GateDj | null = null;
  let djApplication: GateApplication | null = null;

  if (profile?.role === "artist") {
    const artistRow = await withTimeout(
      supabase.from("artists").select("id").eq("profile_id", user.id).maybeSingle(),
      5000,
      maybeSingleTimeoutFallback<GateArtist>(),
    );
    if (artistRow.error) {
      logAccessAnomaly("artist query failed", { userId: user.id, error: artistRow.error.message });
      return resolveAccountAccessState({
        userId: user.id,
        profile,
        dj: null,
        djApplication: null,
        artist: null,
        workspace: "dj",
        queryError: artistRow.error.message,
      });
    }
    artist = artistRow.data as GateArtist | null;
  } else if (profile?.role === "dj") {
    const djRow = await withTimeout(
      supabase.from("djs").select("id, vetting_status").eq("profile_id", user.id).maybeSingle(),
      5000,
      maybeSingleTimeoutFallback<GateDj>(),
    );

    if (djRow.error) {
      logAccessAnomaly("djs query failed", { userId: user.id, error: djRow.error.message });
      return resolveAccountAccessState({
        userId: user.id,
        profile,
        dj: null,
        djApplication: null,
        artist: null,
        workspace: "dj",
        queryError: djRow.error.message,
      });
    }

    dj = djRow.data as GateDj | null;
    if (profile.role === "dj" && !dj) {
      logAccessAnomaly("profile role is dj but no djs row", { userId: user.id, profileId: profile.id });
    }

    if (dj) {
      const appRow = await withTimeout(
        supabase.from("dj_applications").select("id, dj_id").eq("dj_id", dj.id).maybeSingle(),
        5000,
        maybeSingleTimeoutFallback<GateApplication>(),
      );

      if (appRow.error) {
        if (appRow.error.message.toLowerCase().includes("multiple")) {
          logAccessAnomaly("multiple dj_applications for one dj", { userId: user.id, djId: dj.id });
        } else {
          logAccessAnomaly("dj_applications query failed", {
            userId: user.id,
            djId: dj.id,
            error: appRow.error.message,
          });
        }
        return resolveAccountAccessState({
          userId: user.id,
          profile,
          dj,
          djApplication: null,
          artist: null,
          workspace: "dj",
          queryError: appRow.error.message,
        });
      }

      djApplication = appRow.data as GateApplication | null;
    }
  }

  return resolveAccountAccessState({
    userId: user.id,
    profile,
    dj,
    djApplication,
    artist,
    workspace: "dj",
  });
}
