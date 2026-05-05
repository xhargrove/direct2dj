import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { getAdminContext } from "@/lib/admin/context";

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

  const raw = body as {
    title?: unknown;
    credit_artist_name?: unknown;
    featured_artist?: unknown;
  };

  const title = typeof raw.title === "string" ? raw.title.trim() : "";
  const credit = typeof raw.credit_artist_name === "string" ? raw.credit_artist_name.trim() : "";
  const featuredRaw =
    typeof raw.featured_artist === "string" ? raw.featured_artist.trim() : "";

  if (!title) {
    return NextResponse.json({ error: "Title is required." }, { status: 400 });
  }
  if (!credit) {
    return NextResponse.json({ error: "Credit artist name is required." }, { status: 400 });
  }

  const { error } = await ctx.supabase
    .from("tracks")
    .update({
      title,
      credit_artist_name: credit,
      featured_artist: featuredRaw.length > 0 ? featuredRaw : null,
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
  revalidatePath("/dj/feed");
  revalidatePath("/featured");

  return NextResponse.json({ ok: true as const });
}
