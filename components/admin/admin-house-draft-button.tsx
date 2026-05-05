"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { adminCreateHouseDraftTrack } from "@/app/admin/actions";

export function AdminHouseDraftButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onClick() {
    setError(null);
    setPending(true);
    const r = await adminCreateHouseDraftTrack();
    setPending(false);
    if ("error" in r && r.error) {
      setError(r.error);
      return;
    }
    if ("id" in r && r.id) {
      router.push(`/admin/tracks/${r.id}`);
      router.refresh();
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        disabled={pending}
        onClick={() => void onClick()}
        className="inline-flex min-h-11 w-full items-center justify-center rounded-md bg-zinc-900 px-4 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white sm:w-auto"
      >
        {pending ? "Creating draft…" : "New DJ pack under my login (no extra email)"}
      </button>
      {error ? (
        <p className="text-sm text-red-600 dark:text-red-400" role="alert">
          {error}
        </p>
      ) : null}
      <p className="text-xs text-zinc-500 dark:text-zinc-400">
        Uses your admin account for storage and ownership. Set the public artist / featured credits on the track review
        screen (title, credit line, etc.).
      </p>
    </div>
  );
}
