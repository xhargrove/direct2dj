"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import {
  submitTrackForReview,
  updateTrackMetadata,
  type TrackMetadataPayload,
} from "@/app/artist/tracks/actions";
import {
  labelRepDeleteTrack,
  labelRepSubmitTrackForReview,
  labelRepUpdateTrackMetadata,
} from "@/app/label/actions";
import { DeleteTrackButton } from "@/components/artist/delete-track-button";
import { DjPackUploader } from "@/components/artist/dj-pack-uploader";
import { TrackStatusBadges } from "@/components/artist/track-status";
import type { Track, TrackFile } from "@/lib/types/database";
import { validateMetadataForSubmit } from "@/lib/tracks/submit-validation";

function toPayload(state: MetaState): TrackMetadataPayload {
  const bpmNum =
    state.bpm.trim() === "" ? null : Number.parseFloat(state.bpm);
  return {
    title: state.title,
    credit_artist_name: state.credit_artist_name,
    featured_artist: state.featured_artist,
    producer: state.producer,
    genre: state.genre,
    bpm: bpmNum != null && !Number.isNaN(bpmNum) ? bpmNum : null,
    musical_key: state.musical_key,
    explicit_rating: state.explicit_rating,
    release_date: state.release_date || null,
    description: state.description,
    campaign_notes: state.campaign_notes,
  };
}

type MetaState = {
  title: string;
  credit_artist_name: string;
  featured_artist: string;
  producer: string;
  genre: string;
  bpm: string;
  musical_key: string;
  explicit_rating: "explicit" | "clean";
  release_date: string;
  description: string;
  campaign_notes: string;
};

export function TrackEditor({
  track,
  files,
  mode = "artist",
}: {
  track: Track;
  files: TrackFile[];
  /** Label reps edit packs for roster artists they manage (not indie artist accounts). */
  mode?: "artist" | "label";
}) {
  const router = useRouter();
  /** Approved releases: artists can still edit listing metadata; pack files stay fixed here. */
  const packLocked = track.moderation_status === "approved";

  const initial = useMemo<MetaState>(
    () => ({
      title: track.title ?? "",
      credit_artist_name: track.credit_artist_name ?? "",
      featured_artist: track.featured_artist ?? "",
      producer: track.producer ?? "",
      genre: track.genre ?? "",
      bpm: track.bpm != null ? String(track.bpm) : "",
      musical_key: track.musical_key ?? "",
      explicit_rating: track.explicit_rating ?? "clean",
      release_date: track.release_date?.slice(0, 10) ?? "",
      description: track.description ?? "",
      campaign_notes: track.campaign_notes ?? "",
    }),
    [track],
  );

  const [meta, setMeta] = useState<MetaState>(initial);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);
  const [submitMsg, setSubmitMsg] = useState<string | null>(null);
  const [pendingSave, setPendingSave] = useState(false);
  const [pendingSubmit, setPendingSubmit] = useState(false);

  async function onSaveDraft(e: React.FormEvent) {
    e.preventDefault();
    setSaveMsg(null);
    setPendingSave(true);
    const r =
      mode === "label"
        ? await labelRepUpdateTrackMetadata(track.id, toPayload(meta))
        : await updateTrackMetadata(track.id, toPayload(meta));
    setPendingSave(false);
    if ("error" in r && r.error) {
      setSaveMsg(r.error);
      return;
    }
    setSaveMsg("Saved.");
    router.refresh();
  }

  async function handleSubmitForReview() {
    setSubmitMsg(null);
    const payload = toPayload(meta);
    const metaErr = validateMetadataForSubmit(payload);
    if (metaErr) {
      setSubmitMsg(metaErr);
      return;
    }
    setPendingSubmit(true);
    const r =
      mode === "label"
        ? await labelRepSubmitTrackForReview(track.id, payload)
        : await submitTrackForReview(track.id, payload);
    setPendingSubmit(false);
    if ("error" in r && r.error) {
      setSubmitMsg(r.error);
      return;
    }
    router.refresh();
    if (mode === "label") {
      router.push(`/label/artists/${track.artist_id}/tracks`);
    } else {
      router.push(`/artist/tracks/${track.id}`);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-8">
      <TrackStatusBadges
        moderationStatus={track.moderation_status}
        isDraft={track.is_draft}
      />

      {packLocked ? (
        <p className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900 dark:border-emerald-900/40 dark:bg-emerald-950/40 dark:text-emerald-100">
          This track is approved — you can update release metadata below. DJ pack file slots are locked; contact support if
          you need to replace audio after publication.
        </p>
      ) : null}

      <form onSubmit={onSaveDraft} className="space-y-4">
        <h2 className="text-lg font-semibold">Release metadata</h2>
        <p className="text-xs text-zinc-600 dark:text-zinc-400">
          DJs get pack files named from your <strong>song title</strong> and <strong>credited artist</strong> here
          (for example <span className="font-mono">LJ Hellems - Make Way (Clean).mp3</span>) — keep them accurate and match
          what&apos;s on the record.
        </p>

        <label className="block space-y-1">
          <span className="text-sm font-medium">Song title *</span>
          <input
            required
            value={meta.title}
            onChange={(e) => setMeta((m) => ({ ...m, title: e.target.value }))}
            className="min-h-11 w-full rounded-md border border-zinc-300 bg-white px-3 dark:border-zinc-700 dark:bg-zinc-950"
          />
        </label>

        <label className="block space-y-1">
          <span className="text-sm font-medium">Artist name *</span>
          <input
            value={meta.credit_artist_name}
            onChange={(e) =>
              setMeta((m) => ({ ...m, credit_artist_name: e.target.value }))
            }
            className="min-h-11 w-full rounded-md border border-zinc-300 bg-white px-3 dark:border-zinc-700 dark:bg-zinc-950"
          />
        </label>

        <label className="block space-y-1">
          <span className="text-sm font-medium">Featured artist</span>
          <input
            value={meta.featured_artist}
            onChange={(e) =>
              setMeta((m) => ({ ...m, featured_artist: e.target.value }))
            }
            className="min-h-11 w-full rounded-md border border-zinc-300 bg-white px-3 dark:border-zinc-700 dark:bg-zinc-950"
          />
        </label>

        <label className="block space-y-1">
          <span className="text-sm font-medium">Producer</span>
          <input
            value={meta.producer}
            onChange={(e) => setMeta((m) => ({ ...m, producer: e.target.value }))}
            className="min-h-11 w-full rounded-md border border-zinc-300 bg-white px-3 dark:border-zinc-700 dark:bg-zinc-950"
          />
        </label>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block space-y-1">
            <span className="text-sm font-medium">Genre *</span>
            <input
              value={meta.genre}
              onChange={(e) => setMeta((m) => ({ ...m, genre: e.target.value }))}
              className="min-h-11 w-full rounded-md border border-zinc-300 bg-white px-3 dark:border-zinc-700 dark:bg-zinc-950"
            />
          </label>
          <label className="block space-y-1">
            <span className="text-sm font-medium">BPM *</span>
            <input
              inputMode="decimal"
              value={meta.bpm}
              onChange={(e) => setMeta((m) => ({ ...m, bpm: e.target.value }))}
              className="min-h-11 w-full rounded-md border border-zinc-300 bg-white px-3 dark:border-zinc-700 dark:bg-zinc-950"
            />
          </label>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block space-y-1">
            <span className="text-sm font-medium">
              Musical key{" "}
              <span className="font-normal text-zinc-500 dark:text-zinc-400">(optional)</span>
            </span>
            <input
              placeholder="e.g. Am, F#m — leave blank if unknown"
              aria-label="Musical key (optional)"
              value={meta.musical_key}
              onChange={(e) =>
                setMeta((m) => ({ ...m, musical_key: e.target.value }))
              }
              className="min-h-11 w-full rounded-md border border-zinc-300 bg-white px-3 dark:border-zinc-700 dark:bg-zinc-950"
            />
          </label>
          <fieldset className="space-y-2">
            <legend className="text-sm font-medium">Explicit / clean *</legend>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="explicit"
                  checked={meta.explicit_rating === "clean"}
                  onChange={() =>
                    setMeta((m) => ({ ...m, explicit_rating: "clean" }))
                  }
                />
                Clean
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="explicit"
                  checked={meta.explicit_rating === "explicit"}
                  onChange={() =>
                    setMeta((m) => ({ ...m, explicit_rating: "explicit" }))
                  }
                />
                Explicit
              </label>
            </div>
          </fieldset>
        </div>

        <label className="block space-y-1">
          <span className="text-sm font-medium">Release date *</span>
          <input
            type="date"
            value={meta.release_date}
            onChange={(e) =>
              setMeta((m) => ({ ...m, release_date: e.target.value }))
            }
            className="min-h-11 w-full rounded-md border border-zinc-300 bg-white px-3 dark:border-zinc-700 dark:bg-zinc-950"
          />
        </label>

        <label className="block space-y-1">
          <span className="text-sm font-medium">Description *</span>
          <textarea
            rows={4}
            value={meta.description}
            onChange={(e) =>
              setMeta((m) => ({ ...m, description: e.target.value }))
            }
            className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 dark:border-zinc-700 dark:bg-zinc-950"
          />
        </label>

        <label className="block space-y-1">
          <span className="text-sm font-medium">Campaign notes</span>
          <textarea
            rows={3}
            value={meta.campaign_notes}
            onChange={(e) =>
              setMeta((m) => ({ ...m, campaign_notes: e.target.value }))
            }
            className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 dark:border-zinc-700 dark:bg-zinc-950"
          />
        </label>

        <div className="flex flex-wrap gap-3">
          <button
            type="submit"
            disabled={pendingSave}
            className="min-h-11 rounded-md border border-zinc-300 bg-white px-4 text-sm font-medium dark:border-zinc-700 dark:bg-zinc-900"
          >
            {pendingSave ? "Saving…" : packLocked ? "Save metadata" : "Save draft"}
          </button>
        </div>
        {saveMsg ? (
          <p className="text-sm text-zinc-600 dark:text-zinc-400">{saveMsg}</p>
        ) : null}
      </form>

      {!packLocked ? (
        <section className="border-t border-zinc-200 pt-8 dark:border-zinc-800">
          <DjPackUploader
            key={[...files].map((f) => f.id).sort().join(",")}
            trackId={track.id}
            files={files}
            readOnly={packLocked}
            releaseTitle={meta.title}
            creditArtistName={meta.credit_artist_name}
            onUploaded={() => router.refresh()}
          />
        </section>
      ) : null}

      {!packLocked && (track.is_draft || track.moderation_status === "rejected") ? (
        <div className="border-t border-zinc-200 pt-8 dark:border-zinc-800">
          <h3 className="text-lg font-semibold">Submit for admin review</h3>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
            You cannot publish directly. Admins approve tracks for the DJ catalog after review.
          </p>
          <p className="mt-2 text-sm font-medium text-zinc-800 dark:text-zinc-200">
            Before submitting: complete required metadata above (title, artist, genre, BPM, release
            date, description), then upload all required pack files.
          </p>
          <button
            type="button"
            disabled={pendingSubmit}
            onClick={() => void handleSubmitForReview()}
            className="mt-4 min-h-11 rounded-md bg-zinc-900 px-4 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
          >
            {pendingSubmit ? "Submitting…" : "Submit complete DJ pack for review"}
          </button>
          {submitMsg ? (
            <p className="mt-3 text-sm text-red-600 dark:text-red-400" role="alert">
              {submitMsg}
            </p>
          ) : null}
        </div>
      ) : null}

      {track.moderation_status !== "approved" ? (
        <section className="border-t border-red-200 pt-8 dark:border-red-900/40">
          <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            Delete this DJ pack
          </h3>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
            Remove this track and all files from storage. Published (approved) packs cannot be
            deleted here.
          </p>
          <div className="mt-4">
            <DeleteTrackButton
              trackId={track.id}
              trackTitle={track.title || "Untitled"}
              canDelete
              deleteFn={mode === "label" ? labelRepDeleteTrack : undefined}
              redirectTo={
                mode === "label"
                  ? `/label/artists/${track.artist_id}/tracks`
                  : "/artist/tracks"
              }
              className="min-h-11 rounded-md border border-red-300 bg-white px-4 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-60 dark:border-red-800 dark:bg-zinc-900 dark:text-red-300 dark:hover:bg-red-950/40"
            >
              Delete DJ pack
            </DeleteTrackButton>
          </div>
        </section>
      ) : null}
    </div>
  );
}
