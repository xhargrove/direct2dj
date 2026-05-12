import Link from "next/link";
import { AdminTrackBasicsForm } from "@/components/admin/admin-track-basics-form";
import { AdminTrackMetadataForm } from "@/components/admin/admin-track-metadata-form";
import { DjPackUploader } from "@/components/artist/dj-pack-uploader";
import type { TrackFile } from "@/lib/types/database";
import { PACK_SLOT_LABELS, type PackSlot } from "@/lib/tracks/pack-slots";
import type { TrackReviewBundle } from "@/lib/admin/load-track-for-review";
import { SignedAudio, SignedImage } from "@/components/admin/signed-storage-media";
import { TrackReviewActions } from "@/components/admin/track-review-actions";
import { packFileDisplayName } from "@/lib/tracks/dj-download-filename";

function fileLabel(f: TrackFile): string {
  if (f.pack_slot && f.pack_slot in PACK_SLOT_LABELS) {
    return PACK_SLOT_LABELS[f.pack_slot as PackSlot];
  }
  if (f.kind === "audio") return "Audio";
  if (f.kind === "cover") return "Cover";
  return f.kind;
}

function isImageFile(f: TrackFile): boolean {
  return f.kind === "cover" || f.pack_slot === "cover_art";
}

export function AdminTrackReview({ bundle }: { bundle: TrackReviewBundle }) {
  const { track, files, artist, profile, featuredRows, engagement } = bundle;

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-8">
      <div>
        <div className="flex flex-wrap items-baseline gap-2">
          <h1 className="text-2xl font-semibold tracking-tight">{track.title}</h1>
          <span className="rounded-md bg-zinc-100 px-2 py-0.5 text-xs font-medium dark:bg-zinc-800">
            {track.moderation_status}
          </span>
          {!track.catalog_active ? (
            <span className="rounded-md bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-900 dark:bg-amber-900/40 dark:text-amber-100">
              Hidden from catalog
            </span>
          ) : null}
          {track.is_draft ? (
            <span className="rounded-md bg-zinc-200 px-2 py-0.5 text-xs dark:bg-zinc-700">Draft</span>
          ) : null}
        </div>
        <p className="mt-1 text-sm text-zinc-500">
          Credit: {track.credit_artist_name}
          {track.featured_artist ? ` · Feat. ${track.featured_artist}` : ""}
        </p>
      </div>

      <AdminTrackBasicsForm track={track} />

      <section className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
        <h2 className="text-sm font-semibold">Release & account</h2>
        <dl className="mt-3 space-y-3 text-sm">
          {track.credit_artist_name?.trim() ? (
            <div>
              <dt className="text-xs text-zinc-500">Release credit</dt>
              <dd className="mt-0.5 font-medium">{track.credit_artist_name.trim()}</dd>
              <dd className="mt-1 text-xs text-zinc-500">Credited on the release (metadata).</dd>
            </div>
          ) : null}
          <div>
            <dt className="text-xs text-zinc-500">
              {track.credit_artist_name?.trim() ? "Artist account" : "Artist"}
            </dt>
            <dd className="mt-0.5 font-medium">{artist.display_name}</dd>
            <dd className="mt-1 text-xs text-zinc-500">
              {!artist.profile_id ? "Label-managed roster · rep account: " : null}
              {profile.full_name ?? profile.email ?? "—"} · {artist.status}
            </dd>
          </div>
        </dl>
        <Link
          href={`/admin/artists/${artist.id}`}
          className="mt-3 inline-block text-sm font-medium text-zinc-700 underline underline-offset-4 dark:text-zinc-300"
        >
          View artist profile
        </Link>
      </section>

      <AdminTrackMetadataForm track={track} />

      <section className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold">DJ engagement</h2>
          <Link
            href={`/admin/tracks/${track.id}/analytics`}
            className="text-sm font-medium text-zinc-700 underline underline-offset-4 dark:text-zinc-300"
          >
            Full analytics →
          </Link>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-md border border-zinc-100 p-3 text-center dark:border-zinc-800">
            <div className="text-xl font-semibold">{engagement.downloadCount}</div>
            <div className="text-xs text-zinc-500">Downloads</div>
          </div>
          <div className="rounded-md border border-zinc-100 p-3 text-center dark:border-zinc-800">
            <div className="text-xl font-semibold">
              {engagement.ratingAvg != null ? engagement.ratingAvg.toFixed(1) : "—"}
            </div>
            <div className="text-xs text-zinc-500">Avg rating ({engagement.ratingCount})</div>
          </div>
          <div className="rounded-md border border-zinc-100 p-3 text-center dark:border-zinc-800">
            <div className="text-xl font-semibold">{engagement.feedbackCount}</div>
            <div className="text-xs text-zinc-500">Feedback items</div>
          </div>
          <div className="rounded-md border border-zinc-100 p-3 text-center dark:border-zinc-800">
            <div className="text-xl font-semibold">{engagement.playReportsTotal}</div>
            <div className="text-xs text-zinc-500">Reported plays</div>
          </div>
        </div>

        {engagement.byDj.length > 0 ? (
          <div className="mt-6 overflow-x-auto rounded-md border border-zinc-100 dark:border-zinc-800">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="border-b border-zinc-100 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900">
                <tr>
                  <th className="px-3 py-2 font-medium">DJ</th>
                  <th className="px-3 py-2 font-medium">Downloads</th>
                  <th className="px-3 py-2 font-medium">Ratings</th>
                  <th className="px-3 py-2 font-medium">Reported plays</th>
                </tr>
              </thead>
              <tbody>
                {engagement.byDj.map((row) => (
                  <tr key={row.djId} className="border-b border-zinc-50 last:border-0 dark:border-zinc-800">
                    <td className="px-3 py-2">{row.displayName}</td>
                    <td className="px-3 py-2">{row.downloadCount}</td>
                    <td className="px-3 py-2">{row.ratingCount}</td>
                    <td className="px-3 py-2">{row.playReportsTotal}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="mt-4 text-sm text-zinc-500">No per-DJ engagement yet.</p>
        )}
      </section>

      <section className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
        <h2 className="text-sm font-semibold">DJ pack (for DJs)</h2>
        {(track.is_draft ||
          track.moderation_status !== "approved" ||
          track.catalog_active === false) ? (
          <p className="mt-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-100">
            DJs only see this pack when the track is <strong>approved</strong>, <strong>not a draft</strong>,{" "}
            <strong>visible in catalog</strong>, and the artist is active. Artists can still see files here while the
            release is being prepared.
          </p>
        ) : null}
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          These files are what approved DJs download from the catalog. Files are stored under this artist&apos;s
          account ({artist.display_name}), not your admin login. Uploads use the service role so Storage RLS does not
          block artist paths. Ensure <code className="font-mono text-[11px]">SUPABASE_SERVICE_ROLE_KEY</code> is set in{" "}
          <code className="font-mono text-[11px]">.env.local</code> for local admin uploads, or apply the promos admin
          storage migration if you prefer browser-only uploads.
        </p>
        <div className="mt-4">
          <DjPackUploader
            trackId={track.id}
            files={files}
            artistProfileIdForStorage={artist.profile_id ?? artist.managed_by_label_rep_id ?? undefined}
            releaseTitle={track.title ?? ""}
            creditArtistName={track.credit_artist_name ?? ""}
          />
        </div>
      </section>

      <section className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
        <h2 className="text-sm font-semibold">Pack file previews</h2>
        <ul className="mt-4 flex flex-col gap-6">
          {files.map((f) => (
            <li key={f.id} className="border-b border-zinc-100 pb-6 last:border-0 last:pb-0 dark:border-zinc-800">
              <p className="text-xs font-medium text-zinc-600 dark:text-zinc-400">{fileLabel(f)}</p>
              <p className="mt-0.5 text-sm text-zinc-700 dark:text-zinc-300">
                {packFileDisplayName(f, {
                  title: track.title,
                  credit_artist_name: track.credit_artist_name,
                })}
              </p>
              <p className="mt-0.5 font-mono text-[10px] text-zinc-500">
                Storage: {f.storage_path.split("/").pop()}
              </p>
              {isImageFile(f) ? (
                <div className="mt-2">
                  <SignedImage path={f.storage_path} alt={track.title} />
                </div>
              ) : f.kind === "audio" || f.mime_type?.startsWith("audio/") ? (
                <div className="mt-2">
                  <SignedAudio path={f.storage_path} label={fileLabel(f)} />
                </div>
              ) : (
                <p className="mt-2 text-xs text-zinc-500">Preview not available for this file type.</p>
              )}
            </li>
          ))}
        </ul>
        {files.length === 0 ? <p className="mt-2 text-sm text-zinc-500">No files uploaded.</p> : null}
      </section>

      <TrackReviewActions
        trackId={track.id}
        moderationStatus={track.moderation_status}
        catalogActive={track.catalog_active !== false}
        featuredRows={featuredRows}
      />
    </div>
  );
}
