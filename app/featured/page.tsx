import type { Metadata } from "next";
import Link from "next/link";
import { DjTrackCard } from "@/components/dj/track-card";
import { signCoverPaths } from "@/lib/dj/cover-sign";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Featured on Direct 2 DJ",
  description:
    "Tracks spotlighted in Discover right now. DJs sign in to open packs and download.",
};

type FeaturedPublicRow = {
  placement_id: string;
  placement_label: string | null;
  track_id: string;
  title: string;
  credit_artist_name: string | null;
  genre: string | null;
  bpm: number | null;
  explicit_rating: string | null;
  artist_display_name: string | null;
  cover_storage_path: string | null;
  placement_created_at: string;
};

export default async function PublicFeaturedPage() {
  let rows: FeaturedPublicRow[] = [];
  let rpcError: { message: string } | null = null;
  let coverMap = new Map<string, string>();

  try {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("public_active_featured_tracks", { p_limit: 24 });
    if (error) {
      rpcError = error;
    } else {
      rows = (data ?? []) as FeaturedPublicRow[];
      coverMap = await signCoverPaths(
        supabase,
        rows.map((r) => r.cover_storage_path),
      );
    }
  } catch (e) {
    console.error("[featured] load failed", e);
    rpcError = { message: e instanceof Error ? e.message : "Load failed" };
  }

  const error = rpcError;

  return (
    <main className="relative flex flex-1 flex-col overflow-x-hidden">
      <div className="relative mx-auto flex w-full max-w-2xl flex-1 flex-col px-4 pb-24 pt-14 sm:pt-20 md:pt-24">
        <p className="dj-kicker dj-eyebrow mb-3 text-center">Discover</p>
        <h1 className="dj-brand dj-glow-text text-center text-balance text-4xl font-bold leading-tight tracking-tight sm:text-5xl">
          Featured right now
        </h1>
        <p className="dj-lede mx-auto mt-5 max-w-lg text-center">
          Paid or editorial placements in their active window — same picks DJs see at the top of the feed.
          Sign in as a DJ to open a track and grab downloads.
        </p>

        <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
          <Link href="/login?next=%2Fdj%2Ffeed" className="dj-btn-primary">
            DJ sign in
          </Link>
          <Link href="/" className="dj-btn-ghost">
            Back to home
          </Link>
        </div>

        {error ? (
          <p className="mt-12 text-center text-sm text-red-600 dark:text-red-400">
            Could not load featured tracks{error.message ? `: ${error.message}` : ""}. If this persists, ensure
            migration{" "}
            <code className="rounded bg-zinc-100 px-1 text-xs dark:bg-zinc-900">20260522120000_public_featured_catalog</code>{" "}
            is applied.
          </p>
        ) : rows.length === 0 ? (
          <p className="mt-14 text-center text-sm text-zinc-600 dark:text-zinc-400">
            Nothing featured at the moment. Check back soon — or browse the full catalog after you sign in as a DJ.
          </p>
        ) : (
          <section className="mt-14 flex flex-col gap-3">
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">Now spinning</h2>
            <ul className="flex flex-col gap-2">
              {rows.map((row) => {
                const artistLine =
                  row.credit_artist_name && row.credit_artist_name.trim()
                    ? `${row.credit_artist_name}${row.artist_display_name ? ` · ${row.artist_display_name}` : ""}`
                    : row.artist_display_name?.trim() || "Artist";
                const bpm =
                  row.bpm != null && Number.isFinite(Number(row.bpm)) ? Number(row.bpm) : null;
                const explicitLabel =
                  row.explicit_rating === "explicit" ? "Explicit" : "Clean";
                const coverUrl = row.cover_storage_path
                  ? coverMap.get(row.cover_storage_path) ?? null
                  : null;
                const loginNext = `/login?next=${encodeURIComponent(`/dj/tracks/${row.track_id}`)}`;
                return (
                  <li key={row.placement_id}>
                    <DjTrackCard
                      id={row.track_id}
                      title={row.title || "Track"}
                      artistLine={artistLine}
                      genre={row.genre ?? ""}
                      bpm={bpm}
                      explicitLabel={explicitLabel}
                      coverUrl={coverUrl}
                      href={loginNext}
                      footer={
                        row.placement_label ? (
                          <span className="text-amber-700 dark:text-amber-400">{row.placement_label}</span>
                        ) : null
                      }
                    />
                  </li>
                );
              })}
            </ul>
            <p className="mt-4 text-center text-xs text-zinc-500 dark:text-zinc-500">
              Tap a row to sign in — we&apos;ll send you toward that track after authentication.
            </p>
          </section>
        )}
      </div>
    </main>
  );
}
