"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { assignEditorialSpotlight, endEditorialSpotlight } from "@/app/admin/spotlights/actions";
import type { EditorialSpotlightSectionId } from "@/lib/spotlight/load-spotlight-hub";

type TrackOption = { id: string; title: string; credit: string };

export function EditorialSpotlightForm({
  slotType,
  slotLabel,
  defaultDays,
  tracks,
}: {
  slotType: EditorialSpotlightSectionId;
  slotLabel: string;
  defaultDays: number;
  tracks: TrackOption[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  const [trackId, setTrackId] = useState(tracks[0]?.id ?? "");
  const [headline, setHeadline] = useState("");
  const [days, setDays] = useState(String(defaultDays));

  function defaultEndIso(dayCount: number) {
    const d = new Date();
    d.setDate(d.getDate() + dayCount);
    return d.toISOString().slice(0, 16);
  }

  return (
    <form
      className="flex flex-col gap-3 rounded-lg border border-zinc-200 p-4 dark:border-zinc-800"
      onSubmit={(e) => {
        e.preventDefault();
        setErr(null);
        const n = Number.parseInt(days, 10);
        const end = Number.isFinite(n) && n > 0 ? defaultEndIso(n) : null;
        start(async () => {
          const r = await assignEditorialSpotlight({
            slotType,
            trackId,
            headline: headline.trim() || undefined,
            endsAt: end ?? undefined,
          });
          if ("error" in r && r.error) setErr(r.error);
          else router.refresh();
        });
      }}
    >
      <h3 className="font-semibold">{slotLabel}</h3>
      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium">Track</span>
        <select
          value={trackId}
          onChange={(e) => setTrackId(e.target.value)}
          className="min-h-11 rounded-md border border-zinc-300 bg-white px-3 dark:border-zinc-700 dark:bg-zinc-950"
          required
        >
          {tracks.length === 0 ? (
            <option value="">No eligible tracks</option>
          ) : (
            tracks.map((t) => (
              <option key={t.id} value={t.id}>
                {t.title} — {t.credit}
              </option>
            ))
          )}
        </select>
      </label>
      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium">Headline (optional)</span>
        <input
          value={headline}
          onChange={(e) => setHeadline(e.target.value)}
          placeholder="Staff pick copy"
          className="min-h-11 rounded-md border border-zinc-300 bg-white px-3 dark:border-zinc-700 dark:bg-zinc-950"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium">Run for (days)</span>
        <input
          type="number"
          min={1}
          max={90}
          value={days}
          onChange={(e) => setDays(e.target.value)}
          className="min-h-11 w-24 rounded-md border border-zinc-300 bg-white px-3 dark:border-zinc-700 dark:bg-zinc-950"
        />
      </label>
      {err ? <p className="text-sm text-red-600">{err}</p> : null}
      <button
        type="submit"
        disabled={pending || !trackId || tracks.length === 0}
        className="inline-flex min-h-10 max-w-xs items-center justify-center rounded-md bg-zinc-900 px-4 text-sm font-medium text-white disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
      >
        {pending ? "Saving…" : "Assign spotlight"}
      </button>
    </form>
  );
}

export function EndSpotlightButton({ spotlightId }: { spotlightId: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);

  return (
    <span className="inline-flex items-center gap-2">
      <button
        type="button"
        disabled={pending}
        className="text-xs font-medium text-red-600 underline"
        onClick={() => {
          setErr(null);
          start(async () => {
            const r = await endEditorialSpotlight(spotlightId);
            if ("error" in r && r.error) setErr(r.error);
            else router.refresh();
          });
        }}
      >
        End now
      </button>
      {err ? <span className="text-xs text-red-600">{err}</span> : null}
    </span>
  );
}
