"use client";

import type { FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { adminCreateFreeDraftTrack } from "@/app/admin/actions";

export function AdminNewTrackForm({
  artists,
}: {
  artists: readonly { id: string; display_name: string }[];
}) {
  const router = useRouter();
  const [artistId, setArtistId] = useState(() => artists[0]?.id ?? "");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!artistId) {
      setError("Select an artist.");
      return;
    }
    setPending(true);
    setError(null);
    const r = await adminCreateFreeDraftTrack(artistId);
    setPending(false);
    if ("error" in r && r.error) {
      setError(r.error);
      return;
    }
    router.push(`/admin/tracks/${r.id}`);
  }

  if (artists.length === 0) {
    return (
      <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-3 text-sm text-amber-950 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-100">
        No artists in the database yet. Create an artist account first, then open a free draft here.
      </p>
    );
  }

  return (
    <form onSubmit={(ev) => void onSubmit(ev)} className="flex max-w-md flex-col gap-4">
      <label className="block space-y-2 text-sm">
        <span className="font-medium text-zinc-900 dark:text-zinc-100">Artist</span>
        <select
          name="artist_id"
          required
          value={artistId}
          onChange={(ev) => setArtistId(ev.target.value)}
          className="min-h-11 w-full rounded-md border border-zinc-300 bg-white px-3 text-base outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 dark:border-zinc-700 dark:bg-zinc-950"
        >
          {artists.map((a) => (
            <option key={a.id} value={a.id}>
              {a.display_name}
            </option>
          ))}
        </select>
        <span className="block text-xs font-normal text-zinc-500 dark:text-zinc-400">
          The draft is owned by this artist; uploads use their promo storage prefix.
        </span>
      </label>

      <button
        type="submit"
        disabled={pending}
        className="inline-flex min-h-11 items-center justify-center rounded-md bg-zinc-900 px-4 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
      >
        {pending ? "Creating…" : "Create draft (no submission fee)"}
      </button>

      {error ? (
        <p className="text-sm text-red-600 dark:text-red-400" role="alert">
          {error}
        </p>
      ) : null}

      <p className="text-xs text-zinc-500 dark:text-zinc-500">
        Applies migration{" "}
        <code className="rounded bg-zinc-100 px-1 font-mono text-[11px] dark:bg-zinc-900">
          admin_create_draft_track
        </code>{" "}
        on the database if this fails with a missing function error.
      </p>
    </form>
  );
}
