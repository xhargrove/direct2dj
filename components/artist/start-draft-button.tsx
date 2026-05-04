"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createDraftTrack } from "@/app/artist/tracks/actions";

export function StartDraftButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onClick() {
    setError(null);
    setPending(true);
    const r = await createDraftTrack();
    setPending(false);
    if ("error" in r && r.error) {
      setError(r.error);
      return;
    }
    if ("id" in r) {
      router.push(`/artist/tracks/${r.id}/edit`);
      router.refresh();
    }
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={onClick}
        disabled={pending}
        className="inline-flex min-h-11 w-full items-center justify-center rounded-md bg-zinc-900 px-4 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white sm:w-auto"
      >
        {pending ? "Creating…" : "New DJ pack"}
      </button>
      {error ? (
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      ) : null}
    </div>
  );
}
