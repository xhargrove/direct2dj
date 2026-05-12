import { NextResponse } from "next/server";
import { getAdminContext } from "@/lib/admin/context";
import { packStorageObjectBasename } from "@/lib/tracks/pack-storage-basename";
import { isPackSlot, type PackSlot } from "@/lib/tracks/pack-slots";
import { createServiceRoleClientOrNull } from "@/lib/supabase/service-role";
import { assertMimeForSlot } from "@/lib/tracks/upload-rules";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type Body = {
  trackId?: unknown;
  slot?: unknown;
  artistProfileId?: unknown;
  releaseTitle?: unknown;
  creditArtistName?: unknown;
  fileName?: unknown;
  mimeType?: unknown;
};

export async function POST(req: Request) {
  const ctx = await getAdminContext();
  if ("error" in ctx) {
    return NextResponse.json({ error: ctx.error }, { status: 403 });
  }

  const adminSr = createServiceRoleClientOrNull();
  if (!adminSr) {
    return NextResponse.json(
      {
        error:
          "SUPABASE_SERVICE_ROLE_KEY is not set on the server. Admin pack uploads on behalf of an artist need it to mint signed Storage URLs, or use direct client upload only when promos admin storage policies exist.",
      },
      { status: 503 },
    );
  }

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const trackId = typeof body.trackId === "string" ? body.trackId.trim() : "";
  const slotRaw = typeof body.slot === "string" ? body.slot.trim() : "";
  const artistProfileId =
    typeof body.artistProfileId === "string" ? body.artistProfileId.trim() : "";
  const releaseTitle = typeof body.releaseTitle === "string" ? body.releaseTitle : "";
  const creditArtistName = typeof body.creditArtistName === "string" ? body.creditArtistName : "";
  const fileName = typeof body.fileName === "string" ? body.fileName.trim() : "";
  const mimeType = typeof body.mimeType === "string" ? body.mimeType.trim() : "";

  if (!trackId || !UUID_RE.test(trackId)) {
    return NextResponse.json({ error: "Invalid trackId" }, { status: 400 });
  }
  if (!artistProfileId || !UUID_RE.test(artistProfileId)) {
    return NextResponse.json({ error: "Invalid artistProfileId" }, { status: 400 });
  }
  if (!isPackSlot(slotRaw)) {
    return NextResponse.json({ error: "Invalid pack slot" }, { status: 400 });
  }
  const slot = slotRaw as PackSlot;
  if (!fileName || fileName.length > 512) {
    return NextResponse.json({ error: "Invalid fileName" }, { status: 400 });
  }
  if (!mimeType || mimeType.length > 200) {
    return NextResponse.json({ error: "Invalid mimeType" }, { status: 400 });
  }

  try {
    assertMimeForSlot(slot, mimeType);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Invalid file type";
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  const { data: track, error: tErr } = await adminSr
    .from("tracks")
    .select("id, artist_id")
    .eq("id", trackId)
    .maybeSingle();

  if (tErr || !track) {
    return NextResponse.json({ error: tErr?.message ?? "Track not found." }, { status: 400 });
  }

  const { data: artist, error: aErr } = await adminSr
    .from("artists")
    .select("profile_id, managed_by_label_rep_id")
    .eq("id", track.artist_id)
    .maybeSingle();

  if (aErr || !artist) {
    return NextResponse.json({ error: aErr?.message ?? "Artist not found." }, { status: 400 });
  }

  const expectedPrefix = (artist.profile_id ?? artist.managed_by_label_rep_id ?? "").trim();
  if (!expectedPrefix || expectedPrefix !== artistProfileId) {
    return NextResponse.json(
      { error: "artistProfileId does not match this track's storage owner." },
      { status: 400 },
    );
  }

  const fileMeta = { name: fileName, type: mimeType };
  const basename = packStorageObjectBasename(slot, fileMeta, {
    title: releaseTitle,
    credit_artist_name: creditArtistName,
  });
  const path = `${artistProfileId}/tracks/${trackId}/${basename}`;

  const { data: existingRows, error: exErr } = await adminSr
    .from("track_files")
    .select("id, storage_path")
    .eq("track_id", trackId)
    .eq("pack_slot", slot);

  if (exErr) {
    return NextResponse.json({ error: exErr.message }, { status: 400 });
  }

  for (const row of existingRows ?? []) {
    if (row.storage_path) {
      await adminSr.storage.from("promos").remove([row.storage_path]);
    }
    await adminSr.from("track_files").delete().eq("id", row.id);
  }

  const { data: signed, error: signErr } = await adminSr.storage
    .from("promos")
    .createSignedUploadUrl(path, { upsert: true });

  if (signErr || !signed?.token) {
    return NextResponse.json(
      { error: signErr?.message ?? "Could not create signed upload URL." },
      { status: 400 },
    );
  }

  return NextResponse.json({ path: signed.path, token: signed.token });
}
