"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition, type FormEvent } from "react";
import type { Track } from "@/lib/types/database";

export function AdminTrackMetadataForm({ track }: { track: Track }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const tagsArr = Array.isArray(track.admin_tags) ? track.admin_tags : [];
  const tagsInitial = tagsArr.length > 0 ? tagsArr.join(", ") : "";

  const [genre, setGenre] = useState(track.genre ?? "");
  const [bpm, setBpm] = useState(track.bpm != null ? String(track.bpm) : "");
  const [musicalKey, setMusicalKey] = useState(track.musical_key ?? "");
  const [explicitRating, setExplicitRating] = useState(track.explicit_rating ?? "clean");
  const [releaseDate, setReleaseDate] = useState(track.release_date?.slice(0, 10) ?? "");
  const [producer, setProducer] = useState(track.producer ?? "");
  const [description, setDescription] = useState(track.description ?? "");
  const [campaignNotes, setCampaignNotes] = useState(track.campaign_notes ?? "");
  const [adminTags, setAdminTags] = useState(tagsInitial);

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      let bpmPayload: number | null = null;
      const bt = bpm.trim();
      if (bt !== "") {
        const n = Number.parseFloat(bt);
        if (!Number.isFinite(n)) {
          setError("BPM must be a number or blank.");
          return;
        }
        bpmPayload = n;
      }

      const res = await fetch(`/api/admin/tracks/${track.id}/metadata`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          genre,
          bpm: bpmPayload,
          musical_key: musicalKey.trim() || null,
          explicit_rating: explicitRating,
          release_date: releaseDate.trim() || null,
          producer: producer.trim() || null,
          description: description.trim() || null,
          campaign_notes: campaignNotes.trim() || null,
          admin_tags: adminTags,
        }),
      });
      let data: { error?: string } = {};
      try {
        data = (await res.json()) as { error?: string };
      } catch {
        setError("Could not read response.");
        return;
      }
      if (!res.ok) {
        setError(data.error ?? "Save failed.");
        return;
      }
      router.refresh();
    });
  }

  return (
    <form
      onSubmit={onSubmit}
      className="flex flex-col gap-4 rounded-lg border border-zinc-200 p-4 dark:border-zinc-800"
    >
      <div>
        <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Metadata</h2>
        <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
          Release details shown to DJs and in analytics. Saves immediately.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-zinc-900 dark:text-zinc-100">Genre</span>
          <input
            required
            value={genre}
            onChange={(ev) => setGenre(ev.target.value)}
            maxLength={200}
            className="min-h-11 rounded-md border border-zinc-300 bg-white px-3 dark:border-zinc-700 dark:bg-zinc-950"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-zinc-900 dark:text-zinc-100">BPM</span>
          <input
            inputMode="decimal"
            value={bpm}
            onChange={(ev) => setBpm(ev.target.value)}
            placeholder="e.g. 128"
            className="min-h-11 rounded-md border border-zinc-300 bg-white px-3 dark:border-zinc-700 dark:bg-zinc-950"
          />
        </label>
      </div>

      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium text-zinc-900 dark:text-zinc-100">Musical key</span>
        <input
          value={musicalKey}
          onChange={(ev) => setMusicalKey(ev.target.value)}
          maxLength={80}
          placeholder="e.g. Am — leave blank if unknown"
          className="min-h-11 rounded-md border border-zinc-300 bg-white px-3 dark:border-zinc-700 dark:bg-zinc-950"
        />
      </label>

      <fieldset className="space-y-2">
        <legend className="text-sm font-medium text-zinc-900 dark:text-zinc-100">Explicit</legend>
        <div className="flex flex-wrap gap-4 text-sm">
          <label className="flex items-center gap-2">
            <input
              type="radio"
              name="admin-explicit"
              checked={explicitRating === "clean"}
              onChange={() => setExplicitRating("clean")}
            />
            Clean
          </label>
          <label className="flex items-center gap-2">
            <input
              type="radio"
              name="admin-explicit"
              checked={explicitRating === "explicit"}
              onChange={() => setExplicitRating("explicit")}
            />
            Explicit
          </label>
        </div>
      </fieldset>

      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium text-zinc-900 dark:text-zinc-100">Release date</span>
        <input
          type="date"
          value={releaseDate}
          onChange={(ev) => setReleaseDate(ev.target.value)}
          className="min-h-11 rounded-md border border-zinc-300 bg-white px-3 dark:border-zinc-700 dark:bg-zinc-950"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium text-zinc-900 dark:text-zinc-100">Producer</span>
        <input
          value={producer}
          onChange={(ev) => setProducer(ev.target.value)}
          maxLength={300}
          className="min-h-11 rounded-md border border-zinc-300 bg-white px-3 dark:border-zinc-700 dark:bg-zinc-950"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium text-zinc-900 dark:text-zinc-100">Description</span>
        <textarea
          rows={4}
          value={description}
          onChange={(ev) => setDescription(ev.target.value)}
          className="rounded-md border border-zinc-300 bg-white px-3 py-2 dark:border-zinc-700 dark:bg-zinc-950"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium text-zinc-900 dark:text-zinc-100">Campaign notes</span>
        <textarea
          rows={3}
          value={campaignNotes}
          onChange={(ev) => setCampaignNotes(ev.target.value)}
          className="rounded-md border border-zinc-300 bg-white px-3 py-2 dark:border-zinc-700 dark:bg-zinc-950"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium text-zinc-900 dark:text-zinc-100">Admin tags</span>
        <span className="text-xs font-normal text-zinc-500">Comma-separated labels for internal sorting.</span>
        <input
          type="text"
          value={adminTags}
          onChange={(ev) => setAdminTags(ev.target.value)}
          className="min-h-11 rounded-md border border-zinc-300 bg-white px-3 dark:border-zinc-700 dark:bg-zinc-950"
        />
      </label>

      {track.rejection_reason ? (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-900 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-100">
          <span className="font-medium">Rejection reason (read-only): </span>
          <span className="whitespace-pre-wrap">{track.rejection_reason}</span>
        </div>
      ) : null}

      {error ? (
        <p className="text-sm text-red-600 dark:text-red-400" role="alert">
          {error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="inline-flex min-h-10 max-w-xs items-center justify-center rounded-md bg-zinc-900 px-4 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
      >
        {pending ? "Saving…" : "Save metadata"}
      </button>
    </form>
  );
}
