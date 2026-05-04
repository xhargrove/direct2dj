import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export default async function DjDownloadsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const { data: dj } = await supabase.from("djs").select("id").eq("profile_id", user.id).maybeSingle();
  if (!dj) {
    return <p className="text-sm text-red-600">No DJ profile.</p>;
  }

  const { data: rows } = await supabase
    .from("downloads")
    .select(
      `
      id,
      created_at,
      tracks (
        id,
        title,
        credit_artist_name,
        genre,
        artists ( display_name )
      )
    `,
    )
    .eq("dj_id", dj.id)
    .order("created_at", { ascending: false })
    .limit(100);

  type Row = {
    id: string;
    created_at: string;
    tracks: unknown;
  };

  const list = (rows ?? []) as Row[];

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Downloads</h1>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          Logged pack downloads (authenticated sessions only).
        </p>
      </div>

      {list.length === 0 ? (
        <p className="text-sm text-zinc-500">
          No downloads yet.{" "}
          <Link href="/dj/feed" className="underline underline-offset-4">
            Browse the feed
          </Link>
          .
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {list.map((r) => {
            const t = r.tracks as {
              id?: string;
              title?: string;
              credit_artist_name?: string;
              genre?: string;
              artists?: { display_name?: string };
            } | null;
            const title = t?.title ?? "Track";
            const artist =
              t?.credit_artist_name ||
              t?.artists?.display_name ||
              "";
            return (
              <li key={r.id} className="rounded-lg border border-zinc-200 px-4 py-3 dark:border-zinc-800">
                <Link href={`/dj/tracks/${t?.id ?? ""}`} className="font-medium underline-offset-4 hover:underline">
                  {title}
                </Link>
                <div className="text-xs text-zinc-500">
                  {artist}
                  {t?.genre ? ` · ${t.genre}` : ""} · {new Date(r.created_at).toLocaleString()}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
