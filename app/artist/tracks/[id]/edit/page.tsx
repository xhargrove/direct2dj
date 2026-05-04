import Link from "next/link";
import { notFound } from "next/navigation";
import { TrackEditor } from "@/components/artist/track-editor";
import { createClient } from "@/lib/supabase/server";
import type { Track, TrackFile } from "@/lib/types/database";

type Props = { params: Promise<{ id: string }> };

export default async function EditTrackPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: track, error } = await supabase
    .from("tracks")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error || !track) {
    notFound();
  }

  const { data: files } = await supabase
    .from("track_files")
    .select("*")
    .eq("track_id", id);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center gap-3">
        <Link
          href={`/artist/tracks/${id}`}
          className="text-sm text-zinc-600 underline dark:text-zinc-400"
        >
          ← Track detail
        </Link>
        <Link
          href="/artist/tracks"
          className="text-sm text-zinc-600 underline dark:text-zinc-400"
        >
          All tracks
        </Link>
      </div>

      <h1 className="text-2xl font-semibold tracking-tight">Edit DJ pack</h1>

      <TrackEditor track={track as Track} files={(files ?? []) as TrackFile[]} />
    </div>
  );
}
