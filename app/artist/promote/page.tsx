import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import type { Track } from "@/lib/types/database";

export default async function ArtistPromoteIndexPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let tracks: Track[] = [];
  if (user) {
    const { data: artist } = await supabase.from("artists").select("id").eq("profile_id", user.id).maybeSingle();
    if (artist) {
      const { data } = await supabase
        .from("tracks")
        .select("*")
        .eq("artist_id", artist.id)
        .eq("moderation_status", "approved")
        .eq("catalog_active", true)
        .order("updated_at", { ascending: false });
      tracks = (data ?? []) as Track[];
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Promote on DJ feed</h1>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          Paid placements pin your track to the top of Discover after checkout completes. Only approved,
          catalog-visible packs can be promoted.
        </p>
      </div>

      {tracks.length === 0 ? (
        <p className="text-sm text-zinc-500">
          No eligible tracks yet. Submit a pack and wait for approval, or{" "}
          <Link href="/artist/tracks" className="underline underline-offset-4">
            view your tracks
          </Link>
          .
        </p>
      ) : (
        <ul className="divide-y divide-zinc-200 rounded-lg border border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800">
          {tracks.map((t) => (
            <li key={t.id} className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <Link
                  href={`/artist/promote/${t.id}`}
                  className="font-medium text-zinc-900 hover:underline dark:text-zinc-100"
                >
                  {t.title || "Untitled"}
                </Link>
                <p className="mt-1 truncate text-sm text-zinc-500">{t.genre || "—"}</p>
              </div>
              <Link
                href={`/artist/promote/${t.id}`}
                className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-md bg-zinc-900 px-4 text-sm font-medium text-white dark:bg-zinc-100 dark:text-zinc-900"
              >
                Choose plan
              </Link>
            </li>
          ))}
        </ul>
      )}

      <p className="text-xs text-zinc-500">
        Prices are stored in the database and can be adjusted there. See{" "}
        <Link href="/artist/billing" className="underline underline-offset-4">
          Billing
        </Link>{" "}
        for payment status.
      </p>
    </div>
  );
}
