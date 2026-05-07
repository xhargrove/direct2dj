import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { getAdminContext } from "@/lib/admin/context";

function parseTags(raw: string): string[] {
  return raw
    .split(/[,;\n]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export async function PATCH(req: Request, context: { params: Promise<{ id: string }> }) {
  const { id: trackId } = await context.params;

  const ctx = await getAdminContext();
  if ("error" in ctx) {
    return NextResponse.json({ error: ctx.error }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (typeof body !== "object" || body === null) {
    return NextResponse.json({ error: "Expected JSON object" }, { status: 400 });
  }

  const raw = body as Record<string, unknown>;

  const genre = typeof raw.genre === "string" ? raw.genre.trim() : "";
  if (!genre) {
    return NextResponse.json({ error: "Genre is required." }, { status: 400 });
  }

  let bpm: number | null = null;
  if (typeof raw.bpm === "number" && Number.isFinite(raw.bpm)) {
    bpm = raw.bpm;
  } else if (typeof raw.bpm === "string" && raw.bpm.trim() !== "") {
    const n = Number.parseFloat(raw.bpm.trim());
    if (!Number.isFinite(n)) {
      return NextResponse.json({ error: "BPM must be a number." }, { status: 400 });
    }
    bpm = n;
  }

  const musical_key =
    typeof raw.musical_key === "string" && raw.musical_key.trim() !== ""
      ? raw.musical_key.trim()
      : null;

  const explicitRaw = raw.explicit_rating;
  const explicit_rating =
    explicitRaw === "explicit" || explicitRaw === "clean" ? explicitRaw : null;
  if (!explicit_rating) {
    return NextResponse.json({ error: "explicit_rating must be explicit or clean." }, { status: 400 });
  }

  const releaseRaw = typeof raw.release_date === "string" ? raw.release_date.trim() : "";
  const release_date = releaseRaw === "" ? null : releaseRaw;

  const producer =
    typeof raw.producer === "string" && raw.producer.trim() !== "" ? raw.producer.trim() : null;

  const description =
    typeof raw.description === "string" && raw.description.trim() !== ""
      ? raw.description.trim()
      : null;

  const campaign_notes =
    typeof raw.campaign_notes === "string" && raw.campaign_notes.trim() !== ""
      ? raw.campaign_notes.trim()
      : null;

  const admin_tags_csv = typeof raw.admin_tags === "string" ? raw.admin_tags : "";
  const admin_tags = parseTags(admin_tags_csv);

  if (genre.length > 200) {
    return NextResponse.json({ error: "Genre is too long." }, { status: 400 });
  }
  if (musical_key && musical_key.length > 80) {
    return NextResponse.json({ error: "Musical key is too long." }, { status: 400 });
  }

  const { error } = await ctx.supabase
    .from("tracks")
    .update({
      genre,
      bpm,
      musical_key,
      explicit_rating,
      release_date,
      producer,
      description,
      campaign_notes,
      admin_tags,
      updated_at: new Date().toISOString(),
    })
    .eq("id", trackId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  revalidatePath("/admin/tracks");
  revalidatePath(`/admin/submissions/${trackId}`);
  revalidatePath(`/admin/tracks/${trackId}`);
  revalidatePath("/admin/submissions");
  revalidatePath("/admin/dashboard");
  revalidatePath(`/artist/tracks/${trackId}`);
  revalidatePath(`/artist/tracks/${trackId}/edit`);
  revalidatePath("/artist/tracks");
  revalidatePath("/dj/feed");
  revalidatePath(`/dj/tracks/${trackId}`);
  revalidatePath("/featured");

  return NextResponse.json({ ok: true as const });
}
