import Link from "next/link";
import { notFound } from "next/navigation";
import { unstable_noStore as noStore } from "next/cache";
import { TrackEditor } from "@/components/artist/track-editor";
import { createClient } from "@/lib/supabase/server";
import type { Track, TrackFile } from "@/lib/types/database";
import { requireRoles } from "@/lib/auth/require-role";

type Props = { params: Promise<{ artistId: string; id: string }> };

export default async function LabelEditTrackPage({ params }: Props) {
  noStore();
  await requireRoles(["label_rep"]);
  const { artistId, id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) notFound();

  const { data: artist } = await supabase
    .from("artists")
    .select("id")
    .eq("id", artistId)
    .eq("managed_by_label_rep_id", user.id)
    .maybeSingle();

  if (!artist) notFound();

  const { data: track, error } = await supabase.from("tracks").select("*").eq("id", id).eq("artist_id", artistId).maybeSingle();

  if (error || !track) {
    notFound();
  }

  const { data: files } = await supabase.from("track_files").select("*").eq("track_id", id);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center gap-3">
        <Link
          href={`/label/artists/${artistId}/tracks`}
          className="text-sm text-zinc-600 underline dark:text-zinc-400"
        >
          ← All packs for this artist
        </Link>
      </div>

      <h1 className="text-2xl font-semibold tracking-tight">Edit DJ pack (label roster)</h1>

      <TrackEditor track={track as Track} files={(files ?? []) as TrackFile[]} mode="label" />
    </div>
  );
}
