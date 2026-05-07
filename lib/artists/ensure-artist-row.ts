import type { SupabaseClient } from "@supabase/supabase-js";
import type { UserRole } from "@/lib/types/roles";

/**
 * Guarantees a row in `artists` for an authenticated user with `profiles.role = artist`.
 * Idempotent: returns existing `artists.id` when present.
 */
export async function ensureArtistRowForUser(
  supabase: SupabaseClient,
  userId: string,
): Promise<{ artistId: string } | { error: string }> {
  const { data: existing, error: exErr } = await supabase
    .from("artists")
    .select("id")
    .eq("profile_id", userId)
    .maybeSingle();
  if (exErr) {
    return { error: exErr.message };
  }
  if (existing?.id) {
    return { artistId: existing.id };
  }

  const { data: profile, error: pErr } = await supabase
    .from("profiles")
    .select("role, full_name")
    .eq("id", userId)
    .maybeSingle();
  if (pErr) {
    return { error: pErr.message };
  }
  if (!profile || (profile.role as UserRole | undefined) !== "artist") {
    return { error: "Your account is not set up as an artist." };
  }

  const displayName =
    typeof profile.full_name === "string" && profile.full_name.trim().length > 0
      ? profile.full_name.trim()
      : "Artist";

  const { data: created, error: insErr } = await supabase
    .from("artists")
    .insert({
      profile_id: userId,
      display_name: displayName,
      status: "active",
    })
    .select("id")
    .single();

  if (!insErr && created?.id) {
    return { artistId: created.id };
  }

  const { data: raced } = await supabase.from("artists").select("id").eq("profile_id", userId).maybeSingle();
  if (raced?.id) {
    return { artistId: raced.id };
  }

  return { error: insErr?.message ?? "Could not create artist profile." };
}
