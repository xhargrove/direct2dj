import "server-only";

import { revalidatePath } from "next/cache";
import type { SupabaseClient } from "@supabase/supabase-js";
import { packSlotToTrackFileKind } from "@/lib/tracks/file-kind";
import { isPackSlot, type PackSlot } from "@/lib/tracks/pack-slots";
import { assertMimeForSlot, safeStorageFileName } from "@/lib/tracks/upload-rules";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import type { TrackFile } from "@/lib/types/database";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Admin-only pack slot replace using the service role so Storage RLS (artist prefix paths)
 * does not block uploads when `promos_insert_admin` migration is missing locally.
 */
export async function replaceAdminPackSlot(
  userSupabase: SupabaseClient,
  formData: FormData,
): Promise<{ ok: true; file: TrackFile } | { error: string }> {
  const trackId = String(formData.get("trackId") ?? "").trim();
  const slotRaw = String(formData.get("slot") ?? "").trim();
  const file = formData.get("file");

  if (!UUID_RE.test(trackId)) return { error: "Invalid track." };
  if (!isPackSlot(slotRaw)) return { error: "Invalid pack slot." };
  const slot = slotRaw as PackSlot;

  if (!(file instanceof File) || file.size === 0) {
    return { error: "Choose a file to upload." };
  }

  try {
    assertMimeForSlot(slot, file.type);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Invalid file type." };
  }

  let adminSr;
  try {
    adminSr = createServiceRoleClient();
  } catch {
    return {
      error:
        "SUPABASE_SERVICE_ROLE_KEY is not set. Add it to .env.local for admin pack uploads, or apply the promos admin storage migration and use client upload.",
    };
  }

  const { data: tr, error: trErr } = await userSupabase
    .from("tracks")
    .select("id, artists ( profile_id )")
    .eq("id", trackId)
    .maybeSingle();

  if (trErr) return { error: trErr.message };
  if (!tr) return { error: "Track not found." };

  const artists = tr.artists as { profile_id: string } | { profile_id: string }[] | null;
  const profileId = Array.isArray(artists) ? artists[0]?.profile_id : artists?.profile_id;
  if (!profileId || !UUID_RE.test(profileId)) {
    return { error: "Could not resolve artist profile for this track." };
  }

  const { data: existing } = await adminSr
    .from("track_files")
    .select("id, storage_path")
    .eq("track_id", trackId)
    .eq("pack_slot", slot)
    .maybeSingle();

  if (existing?.storage_path) {
    await adminSr.storage.from("promos").remove([existing.storage_path]);
  }
  if (existing?.id) {
    await adminSr.from("track_files").delete().eq("id", existing.id);
  }

  const path = `${profileId}/tracks/${trackId}/${slot}_${safeStorageFileName(file.name)}`;
  const buf = Buffer.from(await file.arrayBuffer());

  const { error: upErr } = await adminSr.storage.from("promos").upload(path, buf, {
    upsert: true,
    cacheControl: "3600",
    contentType: file.type || undefined,
  });

  if (upErr) return { error: upErr.message };

  const kind = packSlotToTrackFileKind(slot);
  const { data: inserted, error: insErr } = await adminSr
    .from("track_files")
    .insert({
      track_id: trackId,
      pack_slot: slot,
      storage_path: path,
      mime_type: file.type || null,
      byte_size: file.size,
      kind,
      sort_order: 0,
    })
    .select("*")
    .single();

  if (insErr) return { error: insErr.message };
  if (!inserted) return { error: "Insert failed." };

  revalidatePath(`/admin/tracks/${trackId}`);
  revalidatePath("/admin/tracks");
  revalidatePath(`/admin/submissions/${trackId}`);
  revalidatePath("/admin/submissions");
  revalidatePath("/admin/dashboard");
  revalidatePath(`/artist/tracks/${trackId}`);
  revalidatePath(`/dj/tracks/${trackId}`);
  revalidatePath("/dj/feed");
  revalidatePath("/featured");

  return { ok: true as const, file: inserted as TrackFile };
}
