import type { Artist, Dj, DjApplication, Profile } from "@/lib/types/database";
import type { UserRole } from "@/lib/types/roles";
import { copyForAccessState } from "@/lib/auth/account-access-copy";

export type AccountAccessState =
  | "SIGNED_OUT"
  | "NO_PROFILE"
  | "ARTIST_ACCOUNT"
  | "DJ_APPLICATION_NOT_STARTED"
  | "DJ_APPLICATION_PENDING"
  | "DJ_APPLICATION_REJECTED"
  | "DJ_APPROVED"
  | "UNKNOWN_ERROR";

export type AccountAccessResult = {
  state: AccountAccessState;
  userId: string | null;
  profile: Pick<Profile, "id" | "role" | "full_name" | "email"> | null;
  djApplication: Pick<DjApplication, "id" | "dj_id"> | null;
  artist: Pick<Artist, "id"> | null;
  dj: Pick<Dj, "id" | "vetting_status"> | null;
  message: string;
};

const VETTING_STATUSES = new Set(["pending", "approved", "rejected", "suspended"]);

export type ResolveAccountAccessInput = {
  userId: string | null;
  profile: Pick<Profile, "id" | "role" | "full_name" | "email"> | null;
  dj: Pick<Dj, "id" | "vetting_status"> | null;
  djApplication: Pick<DjApplication, "id" | "dj_id"> | null;
  artist: Pick<Artist, "id"> | null;
  /** When resolving access for `/dj/*` routes. */
  workspace: "dj";
  queryError?: string | null;
  /** Optional override when state alone is not enough (e.g. suspended). */
  messageOverride?: string | null;
};

function result(
  state: AccountAccessState,
  input: Omit<ResolveAccountAccessInput, "workspace" | "queryError" | "messageOverride"> & {
    messageOverride?: string | null;
  },
): AccountAccessResult {
  const copy = copyForAccessState(state);
  const message = input.messageOverride?.trim() || copy?.message || "";
  return {
    state,
    userId: input.userId,
    profile: input.profile,
    djApplication: input.djApplication,
    artist: input.artist,
    dj: input.dj,
    message,
  };
}

/**
 * Pure resolver — single source of truth for DJ workspace account access.
 * Pass Supabase query results; no I/O inside this function.
 */
export function resolveAccountAccessState(input: ResolveAccountAccessInput): AccountAccessResult {
  const base = {
    userId: input.userId,
    profile: input.profile,
    djApplication: input.djApplication,
    artist: input.artist,
    dj: input.dj,
    messageOverride: input.messageOverride,
  };

  if (input.queryError) {
    return result("UNKNOWN_ERROR", base);
  }

  if (!input.userId) {
    return result("SIGNED_OUT", base);
  }

  if (!input.profile) {
    return result("NO_PROFILE", base);
  }

  const role = input.profile.role as UserRole;

  if (role === "artist") {
    return result("ARTIST_ACCOUNT", base);
  }

  if (role !== "dj") {
    return result("UNKNOWN_ERROR", {
      ...base,
      messageOverride: "This workspace is only available to DJ accounts.",
    });
  }

  if (!input.dj) {
    return result("DJ_APPLICATION_NOT_STARTED", base);
  }

  const vetting = input.dj.vetting_status;
  if (!VETTING_STATUSES.has(vetting)) {
    return result("UNKNOWN_ERROR", {
      ...base,
      messageOverride: "Your DJ account has an unrecognized vetting status. Please contact support.",
    });
  }

  if (vetting === "approved") {
    return result("DJ_APPROVED", base);
  }

  if (vetting === "rejected") {
    return result("DJ_APPLICATION_REJECTED", base);
  }

  if (vetting === "suspended") {
    return result("UNKNOWN_ERROR", {
      ...base,
      messageOverride:
        "Your DJ account is suspended. Promo pool access is disabled. Contact support if you believe this is a mistake.",
    });
  }

  // pending
  if (!input.djApplication) {
    return result("DJ_APPLICATION_NOT_STARTED", base);
  }

  return result("DJ_APPLICATION_PENDING", base);
}

/** DJ catalog routes and downloads require approved vetting. */
export function isDjCatalogAccessAllowed(state: AccountAccessState): boolean {
  return state === "DJ_APPROVED";
}

/** States that should block the entire DJ workspace shell (not just catalog). */
export function isDjWorkspaceShellBlocked(
  state: AccountAccessState,
  dj?: Pick<{ vetting_status: string }, "vetting_status"> | null,
): boolean {
  if (state === "ARTIST_ACCOUNT" || state === "NO_PROFILE") {
    return true;
  }
  if (state === "UNKNOWN_ERROR" && dj?.vetting_status !== "suspended") {
    return true;
  }
  return false;
}
