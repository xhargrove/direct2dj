import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import type { PlayReportVerification } from "@/lib/types/database";

function firstRow<T extends Record<string, unknown>>(tRaw: unknown): T | null {
  if (tRaw && !Array.isArray(tRaw)) return tRaw as T;
  if (Array.isArray(tRaw) && tRaw[0] && typeof tRaw[0] === "object") return tRaw[0] as T;
  return null;
}

function djLabel(dj: { id: string; display_name: string; allow_artist_contact: boolean }) {
  if (dj.allow_artist_contact) return dj.display_name;
  return `DJ #${dj.id.replace(/-/g, "").slice(0, 8)}`;
}

function placeLine(city: string | null, state: string | null) {
  const c = city?.trim();
  const s = state?.trim();
  if (c) return c;
  if (s) return s;
  return "an unspecified location";
}

function verificationBadge(v: PlayReportVerification) {
  if (v === "verified") {
    return (
      <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-900 dark:bg-green-950 dark:text-green-200">
        Verified by admin
      </span>
    );
  }
  return (
    <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
      Self-reported
    </span>
  );
}

export default async function ArtistPlayReportsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: artist } = await supabase
    .from("artists")
    .select("id")
    .eq("profile_id", user.id)
    .maybeSingle();
  if (!artist) return <p className="text-sm text-red-600">No artist profile.</p>;

  const { data: myTracks } = await supabase.from("tracks").select("id").eq("artist_id", artist.id);
  const trackIds = (myTracks ?? []).map((t) => t.id);
  if (trackIds.length === 0) {
    return (
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Play reports</h1>
          <p className="mt-2 text-sm text-zinc-500">Upload tracks first — play reports will appear here.</p>
        </div>
      </div>
    );
  }

  const { data: rows, error } = await supabase
    .from("play_reports")
    .select(
      `
      id,
      played_at,
      venue_name,
      city,
      state,
      event_name,
      estimated_crowd_size,
      crowd_reaction,
      notes,
      proof_url,
      verification_status,
      tracks ( id, title, artist_id ),
      djs ( id, display_name, allow_artist_contact )
    `,
    )
    .in("track_id", trackIds)
    .order("played_at", { ascending: false })
    .limit(100);

  if (error) {
    return <p className="text-sm text-red-600">Could not load play reports: {error.message}</p>;
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Play reports</h1>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          When DJs report playing your tracks, they appear here. Self-reported plays are not verified
          unless an admin confirms them.
        </p>
      </div>

      {!rows || rows.length === 0 ? (
        <p className="text-sm text-zinc-500">No play reports for your tracks yet.</p>
      ) : (
        <ul className="flex flex-col gap-5">
          {rows.map((r) => {
            const track = firstRow<{ id: string; title: string; artist_id: string }>(r.tracks);
            const dj = firstRow<{
              id: string;
              display_name: string;
              allow_artist_contact: boolean;
            }>(r.djs);
            const v = r.verification_status as PlayReportVerification;
            const name = dj ? djLabel(dj) : "A DJ";
            const place = placeLine(r.city, r.state);
            const notification = `Your track was reported played by ${name} in ${place} to an estimated crowd of ${r.estimated_crowd_size}.`;

            if (!track) return null;

            return (
              <li
                key={r.id}
                className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <Link
                    href={`/artist/tracks/${track.id}`}
                    className="font-medium underline-offset-4 hover:underline"
                  >
                    {track.title}
                  </Link>
                  {verificationBadge(v)}
                </div>
                <p className="mt-3 text-sm leading-relaxed text-zinc-800 dark:text-zinc-200">
                  {notification}
                </p>
                <div className="mt-2 text-xs text-zinc-500">
                  {r.played_at} · {r.event_name} · {r.venue_name}
                  {r.crowd_reaction
                    ? ` · Reaction: ${String(r.crowd_reaction).replace("_", " ")}`
                    : ""}
                </div>
                {r.notes ? (
                  <p className="mt-2 text-sm text-zinc-700 dark:text-zinc-300">{r.notes}</p>
                ) : null}
                {r.proof_url ? (
                  <p className="mt-2 text-sm">
                    <a
                      href={r.proof_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline underline-offset-4"
                    >
                      Proof link
                    </a>
                  </p>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
