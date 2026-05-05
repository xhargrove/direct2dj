"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition, type FormEvent } from "react";
import type { Track } from "@/lib/types/database";

export function AdminTrackBasicsForm({ track }: { track: Track }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [title, setTitle] = useState(track.title);
  const [credit, setCredit] = useState(track.credit_artist_name);
  const [featured, setFeatured] = useState(track.featured_artist ?? "");

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const res = await fetch(`/api/admin/tracks/${track.id}/basics`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          credit_artist_name: credit,
          featured_artist: featured,
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
    <form onSubmit={onSubmit} className="flex flex-col gap-4 rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
      <div>
        <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Title &amp; artist credits</h2>
        <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
          These appear on the DJ catalog and promos. They do not change the roster account name under &quot;Artist&quot;
          below unless you edit that profile separately.
        </p>
      </div>

      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium text-zinc-900 dark:text-zinc-100">Track title</span>
        <input
          name="title"
          required
          minLength={1}
          maxLength={300}
          value={title}
          onChange={(ev) => setTitle(ev.target.value)}
          className="min-h-11 rounded-md border border-zinc-300 bg-white px-3 dark:border-zinc-700 dark:bg-zinc-950"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium text-zinc-900 dark:text-zinc-100">Credit artist name</span>
        <input
          name="credit_artist_name"
          required
          minLength={1}
          maxLength={300}
          value={credit}
          onChange={(ev) => setCredit(ev.target.value)}
          className="min-h-11 rounded-md border border-zinc-300 bg-white px-3 dark:border-zinc-700 dark:bg-zinc-950"
          placeholder="Primary artist as DJs should see it"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium text-zinc-900 dark:text-zinc-100">Featured artist (optional)</span>
        <input
          name="featured_artist"
          maxLength={300}
          value={featured}
          onChange={(ev) => setFeatured(ev.target.value)}
          className="min-h-11 rounded-md border border-zinc-300 bg-white px-3 dark:border-zinc-700 dark:bg-zinc-950"
          placeholder="Leave blank if none"
        />
      </label>

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
        {pending ? "Saving…" : "Save title & credits"}
      </button>
    </form>
  );
}
