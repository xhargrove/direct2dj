import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { TrackStatusBadges } from "@/components/artist/track-status";
import type { Track } from "@/lib/types/database";

export default async function ArtistTracksPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let tracks: Track[] = [];
  if (user) {
    const { data: artist } = await supabase
      .from("artists")
      .select("id")
      .eq("profile_id", user.id)
      .maybeSingle();
    if (artist) {
      const { data } = await supabase
        .from("tracks")
        .select("*")
        .eq("artist_id", artist.id)
        .order("updated_at", { ascending: false });
      tracks = (data ?? []) as Track[];
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Your tracks</h1>
        <Link
          href="/artist/tracks/new"
          className="inline-flex min-h-11 items-center justify-center rounded-md bg-zinc-900 px-4 text-sm font-medium text-white dark:bg-zinc-100 dark:text-zinc-900"
        >
          New DJ pack
        </Link>
      </div>

      {tracks.length === 0 ? (
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          No tracks yet. Create a DJ pack to get started.
        </p>
      ) : (
        <ul className="divide-y divide-zinc-200 rounded-lg border border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800">
          {tracks.map((t) => (
            <li key={t.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0 flex-1">
                <Link
                  href={`/artist/tracks/${t.id}`}
                  className="font-medium text-zinc-900 hover:underline dark:text-zinc-100"
                >
                  {t.title || "Untitled"}
                </Link>
                <p className="mt-1 truncate text-sm text-zinc-500">
                  {t.credit_artist_name || "—"} · {t.genre || "—"}
                </p>
                <div className="mt-2">
                  <TrackStatusBadges
                    moderationStatus={t.moderation_status}
                    isDraft={t.is_draft}
                  />
                </div>
              </div>
              <div className="flex shrink-0 flex-wrap gap-3">
                <Link
                  href={`/artist/tracks/${t.id}/analytics`}
                  className="text-sm font-medium text-zinc-900 underline dark:text-zinc-100"
                >
                  Analytics
                </Link>
                <Link
                  href={`/artist/tracks/${t.id}/edit`}
                  className="text-sm font-medium text-zinc-900 underline dark:text-zinc-100"
                >
                  Edit
                </Link>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
