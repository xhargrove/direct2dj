import Link from "next/link";
import { notFound } from "next/navigation";
import { unstable_noStore as noStore } from "next/cache";
import { DeleteTrackButton } from "@/components/artist/delete-track-button";
import { TrackStatusBadges } from "@/components/artist/track-status";
import { createClient } from "@/lib/supabase/server";
import type { Track, TrackFile } from "@/lib/types/database";

type Props = { params: Promise<{ id: string }> };

export default async function ArtistTrackDetailPage({ params }: Props) {
  noStore();
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

  const t = track as Track;

  const { data: files } = await supabase
    .from("track_files")
    .select("*")
    .eq("track_id", id)
    .order("created_at", { ascending: true });

  const fileList = (files ?? []) as TrackFile[];

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-8">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
        <Link href="/artist/tracks" className="text-zinc-600 underline dark:text-zinc-400">
          ← All tracks
        </Link>
        <Link href={`/artist/tracks/${id}/analytics`} className="font-medium text-zinc-900 underline dark:text-zinc-100">
          Analytics
        </Link>
      </div>

      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{t.title || "Untitled"}</h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          {t.credit_artist_name || "—"}
          {t.featured_artist ? ` feat. ${t.featured_artist}` : ""}
        </p>
        <div className="mt-4">
          <TrackStatusBadges
            moderationStatus={t.moderation_status}
            isDraft={t.is_draft ?? true}
          />
        </div>
      </div>

      <dl className="grid gap-3 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-zinc-500">Producer</dt>
          <dd>{t.producer || "—"}</dd>
        </div>
        <div>
          <dt className="text-zinc-500">Genre</dt>
          <dd>{t.genre || "—"}</dd>
        </div>
        <div>
          <dt className="text-zinc-500">BPM</dt>
          <dd>{t.bpm ?? "—"}</dd>
        </div>
        <div>
          <dt className="text-zinc-500">Key</dt>
          <dd>{t.musical_key || "—"}</dd>
        </div>
        <div>
          <dt className="text-zinc-500">Explicit / clean</dt>
          <dd className="capitalize">{t.explicit_rating ?? "—"}</dd>
        </div>
        <div>
          <dt className="text-zinc-500">Release date</dt>
          <dd>{t.release_date ?? "—"}</dd>
        </div>
      </dl>

      <div>
        <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Description</h2>
        <p className="mt-2 whitespace-pre-wrap text-sm text-zinc-700 dark:text-zinc-300">
          {t.description || "—"}
        </p>
      </div>

      <div>
        <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
          Campaign notes
        </h2>
        <p className="mt-2 whitespace-pre-wrap text-sm text-zinc-700 dark:text-zinc-300">
          {t.campaign_notes || "—"}
        </p>
      </div>

      <div>
        <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">DJ pack files</h2>
        <ul className="mt-2 space-y-2 text-sm">
          {fileList.length === 0 ? (
            <li className="text-zinc-500">No files uploaded.</li>
          ) : (
            fileList.map((f) => (
              <li key={f.id} className="flex justify-between gap-2 border-b border-zinc-100 pb-2 dark:border-zinc-900">
                <span className="font-medium capitalize">
                  {(f.pack_slot ?? f.kind).replace(/_/g, " ")}
                </span>
                <span className="truncate text-zinc-500">
                  {f.storage_path.split("/").pop()}
                </span>
              </li>
            ))
          )}
        </ul>
      </div>

      {t.moderation_status !== "approved" ? (
        <div className="flex flex-wrap items-center gap-4">
          <Link
            href={`/artist/tracks/${id}/edit`}
            className="inline-flex min-h-11 items-center justify-center rounded-md bg-zinc-900 px-4 text-sm font-medium text-white dark:bg-zinc-100 dark:text-zinc-900"
          >
            Edit pack
          </Link>
          <DeleteTrackButton
            trackId={id}
            trackTitle={t.title || "Untitled"}
            canDelete
          />
        </div>
      ) : null}
    </div>
  );
}
