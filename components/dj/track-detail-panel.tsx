"use client";

import { useEffect, useState, useTransition } from "react";
import {
  prepareDjPackDownload,
  signTrackPreview,
  submitFeedback,
  submitRating,
  type DjRatingInput,
  type PackDownloadFile,
} from "@/app/dj/actions";
import type { CrowdReaction } from "@/lib/types/database";

function boolToSelect(v: boolean | null): "" | "yes" | "no" {
  if (v === true) return "yes";
  if (v === false) return "no";
  return "";
}

function selectToBool(v: string): boolean | null {
  if (v === "yes") return true;
  if (v === "no") return false;
  return null;
}

export type InitialDjRating = {
  score: number | null;
  club_ready: boolean | null;
  radio_ready: boolean | null;
  rating_comment: string | null;
  crowd_reaction: CrowdReaction | null;
};

export function TrackDetailPanel({
  trackId,
  title,
  creditLine,
  genre,
  bpm,
  musicalKey,
  explicitLabel,
  releaseDate,
  description,
  coverSignedUrl,
  initialRating,
  initialFeedbackBody,
  feedbackModerationStatus,
}: {
  trackId: string;
  title: string;
  creditLine: string;
  genre: string;
  bpm: number | null;
  musicalKey: string | null;
  explicitLabel: string;
  releaseDate: string | null;
  description: string | null;
  coverSignedUrl: string | null;
  initialRating: InitialDjRating;
  initialFeedbackBody: string;
  feedbackModerationStatus: string | null;
}) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewErr, setPreviewErr] = useState<string | null>(null);
  const [packFiles, setPackFiles] = useState<PackDownloadFile[] | null>(null);
  const [packErr, setPackErr] = useState<string | null>(null);
  const [ratingMsg, setRatingMsg] = useState<string | null>(null);
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);
  const [packSuccessMsg, setPackSuccessMsg] = useState<string | null>(null);
  const [feedback, setFeedback] = useState(initialFeedbackBody);
  const [pending, startTransition] = useTransition();

  const [score, setScore] = useState<number | null>(initialRating.score);
  const [clubSel, setClubSel] = useState<string>(boolToSelect(initialRating.club_ready));
  const [radioSel, setRadioSel] = useState<string>(boolToSelect(initialRating.radio_ready));
  const [ratingComment, setRatingComment] = useState(initialRating.rating_comment ?? "");
  const [crowd, setCrowd] = useState<string>(initialRating.crowd_reaction ?? "");

  const [pendingRating, startRatingTransition] = useTransition();

  useEffect(() => {
    let cancelled = false;
    signTrackPreview(trackId).then((r) => {
      if (cancelled) return;
      if ("signedUrl" in r && r.signedUrl) setPreviewUrl(r.signedUrl);
      else if ("error" in r && r.error) setPreviewErr(r.error);
    });
    return () => {
      cancelled = true;
    };
  }, [trackId]);

  function buildRatingPayload(): DjRatingInput | null {
    if (score == null || score < 1 || score > 5) return null;
    const cr: CrowdReaction | null =
      crowd === "cold" || crowd === "warm" || crowd === "strong" || crowd === "hit_potential"
        ? crowd
        : null;
    return {
      score,
      club_ready: selectToBool(clubSel),
      radio_ready: selectToBool(radioSel),
      rating_comment: ratingComment.trim() || null,
      crowd_reaction: cr,
    };
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-4 sm:flex-row">
        <div className="relative mx-auto aspect-square w-full max-w-xs overflow-hidden rounded-xl border border-zinc-200 bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-900 sm:mx-0">
          {coverSignedUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={coverSignedUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full items-center justify-center text-4xl font-semibold text-zinc-400">
              {title.slice(0, 2)}
            </div>
          )}
        </div>
        <div className="flex flex-1 flex-col gap-2">
          <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
          <p className="text-zinc-600 dark:text-zinc-400">{creditLine}</p>
          <dl className="mt-2 grid grid-cols-2 gap-2 text-sm">
            <div>
              <dt className="text-xs text-zinc-500">Genre</dt>
              <dd>{genre}</dd>
            </div>
            <div>
              <dt className="text-xs text-zinc-500">BPM</dt>
              <dd>{bpm != null ? Math.round(bpm) : "—"}</dd>
            </div>
            <div>
              <dt className="text-xs text-zinc-500">Key</dt>
              <dd>{musicalKey ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-xs text-zinc-500">Explicit</dt>
              <dd>{explicitLabel}</dd>
            </div>
            {releaseDate ? (
              <div className="col-span-2">
                <dt className="text-xs text-zinc-500">Release</dt>
                <dd>{releaseDate}</dd>
              </div>
            ) : null}
          </dl>
          {description ? (
            <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-400">{description}</p>
          ) : null}
        </div>
      </div>

      <section>
        <h2 className="text-sm font-semibold">Preview</h2>
        {previewErr ? (
          <p className="mt-2 text-sm text-red-600">{previewErr}</p>
        ) : previewUrl ? (
          <audio controls className="mt-2 w-full max-w-md" src={previewUrl} preload="metadata" />
        ) : (
          <p className="mt-2 text-sm text-zinc-500">Loading preview…</p>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold">DJ pack</h2>
        <p className="text-xs text-zinc-500">
          Creates a downloads record with your DJ ID, timestamp, and a snapshot of pack files, then opens signed
          links (session required — not public).
        </p>
        <button
          type="button"
          disabled={pending}
          className="min-h-11 max-w-xs rounded-md bg-zinc-900 px-4 text-sm font-medium text-white disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
          onClick={() =>
            startTransition(async () => {
              setPackErr(null);
              setPackSuccessMsg(null);
              const r = await prepareDjPackDownload(trackId);
              if ("error" in r && r.error) {
                setPackErr(r.error);
                return;
              }
              if ("files" in r && r.files) {
                setPackFiles(r.files);
                setPackSuccessMsg("Pack ready — use the links below.");
              }
            })
          }
        >
          Download DJ pack
        </button>
        {packErr ? <p className="text-sm text-red-600">{packErr}</p> : null}
        {packSuccessMsg && !packErr ? (
          <p className="text-sm text-emerald-700 dark:text-emerald-400">{packSuccessMsg}</p>
        ) : null}
        {packFiles && packFiles.length > 0 ? (
          <ul className="flex flex-col gap-2 text-sm">
            {packFiles.map((f, i) => (
              <li key={`${f.filename}-${i}`}>
                <a href={f.signedUrl} className="font-medium underline underline-offset-4" download={f.filename}>
                  {f.filename}
                </a>
                {f.pack_slot ? (
                  <span className="ml-2 text-xs text-zinc-500">({f.pack_slot})</span>
                ) : null}
              </li>
            ))}
          </ul>
        ) : null}
      </section>

      <section className="flex flex-col gap-4 rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
        <h2 className="text-sm font-semibold">Your rating</h2>
        <p className="text-xs text-zinc-500">
          One rating per track (you can update anytime). Optional fields go with this rating row.
        </p>

        <div>
          <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">Stars (required to save)</span>
          <div className="mt-2 flex flex-wrap gap-2">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                disabled={pendingRating}
                className={`min-h-10 min-w-10 rounded-md border text-sm font-medium ${
                  score === n
                    ? "border-zinc-900 bg-zinc-900 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900"
                    : "border-zinc-300 dark:border-zinc-600"
                }`}
                onClick={() => setScore(n)}
              >
                {n}
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1 text-xs font-medium text-zinc-600 dark:text-zinc-400">
            Club ready
            <select
              value={clubSel}
              onChange={(e) => setClubSel(e.target.value)}
              className="rounded-md border border-zinc-300 px-2 py-2 text-sm dark:border-zinc-600"
            >
              <option value="">No answer</option>
              <option value="yes">Yes</option>
              <option value="no">No</option>
            </select>
          </label>
          <label className="flex flex-col gap-1 text-xs font-medium text-zinc-600 dark:text-zinc-400">
            Radio ready
            <select
              value={radioSel}
              onChange={(e) => setRadioSel(e.target.value)}
              className="rounded-md border border-zinc-300 px-2 py-2 text-sm dark:border-zinc-600"
            >
              <option value="">No answer</option>
              <option value="yes">Yes</option>
              <option value="no">No</option>
            </select>
          </label>
        </div>

        <label className="flex flex-col gap-1 text-xs font-medium text-zinc-600 dark:text-zinc-400">
          Optional note with this rating
          <textarea
            value={ratingComment}
            onChange={(e) => setRatingComment(e.target.value)}
            rows={3}
            placeholder="Short note (stored on your rating)"
            className="rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-600"
          />
        </label>

        <label className="flex flex-col gap-1 text-xs font-medium text-zinc-600 dark:text-zinc-400">
          Crowd reaction (optional)
          <select
            value={crowd}
            onChange={(e) => setCrowd(e.target.value)}
            className="rounded-md border border-zinc-300 px-2 py-2 text-sm dark:border-zinc-600"
          >
            <option value="">No answer</option>
            <option value="cold">Cold</option>
            <option value="warm">Warm</option>
            <option value="strong">Strong</option>
            <option value="hit_potential">Hit potential</option>
          </select>
        </label>

        <button
          type="button"
          disabled={pendingRating}
          className="min-h-11 max-w-xs rounded-md bg-zinc-900 px-4 text-sm font-medium text-white disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
          onClick={() =>
            startRatingTransition(async () => {
              setRatingMsg(null);
              const payload = buildRatingPayload();
              if (!payload) {
                setRatingMsg("Pick a star rating (1–5) before saving.");
                return;
              }
              const r = await submitRating(trackId, payload);
              if ("error" in r && r.error) setRatingMsg(r.error);
              else setRatingMsg("Rating saved.");
            })
          }
        >
          Save rating
        </button>
        {ratingMsg ? (
          <p className="text-sm text-zinc-700 dark:text-zinc-300" role="status">
            {ratingMsg}
          </p>
        ) : null}
      </section>

      <section>
        <h2 className="text-sm font-semibold">Feedback (moderated)</h2>
        <p className="text-xs text-zinc-500">
          Separate from the rating note. You can update your feedback later; resubmissions update the same record.
        </p>
        {feedbackModerationStatus ? (
          <p className="mt-1 text-xs text-zinc-500">
            Status: <span className="font-medium">{feedbackModerationStatus}</span>
          </p>
        ) : null}
        <textarea
          value={feedback}
          onChange={(e) => setFeedback(e.target.value)}
          rows={4}
          placeholder="Notes for the artist…"
          className="mt-2 w-full max-w-lg rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-600"
        />
        <button
          type="button"
          disabled={pending}
          className="mt-2 min-h-10 rounded-md border border-zinc-300 px-4 text-sm dark:border-zinc-600"
          onClick={() =>
            startTransition(async () => {
              setFeedbackMsg(null);
              const r = await submitFeedback(trackId, feedback);
              if ("error" in r && r.error) setFeedbackMsg(r.error);
              else setFeedbackMsg("Feedback saved.");
            })
          }
        >
          Send feedback
        </button>
        {feedbackMsg ? (
          <p className="mt-2 text-sm text-zinc-700 dark:text-zinc-300" role="status">
            {feedbackMsg}
          </p>
        ) : null}
      </section>
    </div>
  );
}
