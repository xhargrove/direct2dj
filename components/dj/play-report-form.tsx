"use client";

import { useActionState } from "react";
import { submitPlayReport } from "@/app/dj/play-reports/actions";

type TrackOption = { id: string; label: string };

export function PlayReportForm({
  trackOptions,
  defaultTrackId,
  defaultPlayedAt,
  unknownTrackId,
}: {
  trackOptions: TrackOption[];
  defaultTrackId: string | null;
  defaultPlayedAt: string;
  unknownTrackId: boolean;
}) {
  const [state, formAction, pending] = useActionState(submitPlayReport, null);

  return (
    <form action={formAction} className="mx-auto flex w-full max-w-lg flex-col gap-4">
      {state?.error ? (
        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
          {state.error}
        </p>
      ) : null}
      {unknownTrackId ? (
        <p className="text-sm text-amber-800 dark:text-amber-200">
          That track isn’t in your catalog selection — pick a track below or open this page from the
          feed or track detail.
        </p>
      ) : null}

      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium">Track</span>
        <select
          name="track_id"
          required
          className="rounded-md border border-zinc-300 px-3 py-2 dark:border-zinc-600 dark:bg-zinc-900"
          defaultValue={defaultTrackId ?? ""}
        >
          <option value="" disabled>
            {trackOptions.length === 0 ? "No tracks in catalog" : "Select a track"}
          </option>
          {trackOptions.map((o) => (
            <option key={o.id} value={o.id}>
              {o.label}
            </option>
          ))}
        </select>
        <span className="text-xs text-zinc-500">
          Only approved catalog tracks you can access appear here.
        </span>
      </label>

      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium">Venue name</span>
        <input
          name="venue_name"
          type="text"
          required
          autoComplete="off"
          className="rounded-md border border-zinc-300 px-3 py-2 dark:border-zinc-600 dark:bg-zinc-900"
        />
      </label>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium">City</span>
          <input
            name="city"
            type="text"
            autoComplete="address-level2"
            className="rounded-md border border-zinc-300 px-3 py-2 dark:border-zinc-600 dark:bg-zinc-900"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium">State / region</span>
          <input
            name="state"
            type="text"
            autoComplete="address-level1"
            className="rounded-md border border-zinc-300 px-3 py-2 dark:border-zinc-600 dark:bg-zinc-900"
          />
        </label>
      </div>

      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium">Event name</span>
        <input
          name="event_name"
          type="text"
          required
          autoComplete="off"
          className="rounded-md border border-zinc-300 px-3 py-2 dark:border-zinc-600 dark:bg-zinc-900"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium">Date played</span>
        <input
          name="played_at"
          type="date"
          required
          defaultValue={defaultPlayedAt}
          className="rounded-md border border-zinc-300 px-3 py-2 dark:border-zinc-600 dark:bg-zinc-900"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium">Estimated crowd size</span>
        <input
          name="estimated_crowd_size"
          type="text"
          required
          placeholder="e.g. 50–150"
          className="rounded-md border border-zinc-300 px-3 py-2 dark:border-zinc-600 dark:bg-zinc-900"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium">Crowd reaction</span>
        <select
          name="crowd_reaction"
          className="rounded-md border border-zinc-300 px-3 py-2 dark:border-zinc-600 dark:bg-zinc-900"
          defaultValue=""
        >
          <option value="">No reaction recorded</option>
          <option value="cold">Cold</option>
          <option value="warm">Warm</option>
          <option value="strong">Strong</option>
          <option value="hit_potential">Hit potential</option>
        </select>
      </label>

      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium">Notes</span>
        <textarea
          name="notes"
          rows={4}
          defaultValue=""
          placeholder="How did it go?"
          className="rounded-md border border-zinc-300 px-3 py-2 dark:border-zinc-600 dark:bg-zinc-900"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium">Video / photo proof (optional)</span>
        <input
          name="proof_url"
          type="url"
          placeholder="https://…"
          className="rounded-md border border-zinc-300 px-3 py-2 dark:border-zinc-600 dark:bg-zinc-900"
        />
      </label>

      <p className="text-xs text-zinc-600 dark:text-zinc-400">
        Submissions are self-reported until an admin marks them verified. Proof links help review but
        do not auto-verify a report.
      </p>

      <button
        type="submit"
        disabled={pending || trackOptions.length === 0}
        className="min-h-10 rounded-md bg-zinc-900 px-4 text-sm font-medium text-white disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
      >
        {pending ? "Submitting…" : "Submit play report"}
      </button>
    </form>
  );
}
