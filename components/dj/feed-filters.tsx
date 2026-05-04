"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";

const sortOptions = [
  { value: "newest", label: "Newest" },
  { value: "downloads", label: "Most downloaded" },
  { value: "rating", label: "Highest rated" },
] as const;

type SortValue = (typeof sortOptions)[number]["value"];

export function DjFeedFilters({ genreOptions }: { genreOptions: string[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();

  const update = (updates: Record<string, string | null>) => {
    const next = new URLSearchParams(searchParams.toString());
    for (const [k, v] of Object.entries(updates)) {
      if (v === null || v === "") next.delete(k);
      else next.set(k, v);
    }
    next.delete("page");
    startTransition(() => {
      router.push(`/dj/feed?${next.toString()}`);
    });
  };

  const qParam = searchParams.get("q") ?? "";

  const genre = searchParams.get("genre") ?? "";
  const bpmMin = searchParams.get("bpm_min") ?? "";
  const bpmMax = searchParams.get("bpm_max") ?? "";
  const explicit = searchParams.get("explicit") ?? "";
  const sort = (searchParams.get("sort") ?? "newest") as SortValue;

  return (
    <div className="flex flex-col gap-4 rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-xs font-medium text-zinc-600 dark:text-zinc-400">
          Search (press Enter)
          <input
            key={qParam}
            type="search"
            defaultValue={qParam}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                const v = (e.currentTarget as HTMLInputElement).value.trim();
                update({ q: v || null });
              }
            }}
            placeholder="Artist or song"
            className="rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-600"
            disabled={pending}
          />
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-zinc-600 dark:text-zinc-400">
          Genre
          <select
            value={genre}
            className="rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-600"
            onChange={(e) => update({ genre: e.target.value || null })}
            disabled={pending}
          >
            <option value="">All genres</option>
            {genreOptions.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-zinc-600 dark:text-zinc-400">
          BPM min
          <input
            type="number"
            inputMode="numeric"
            placeholder="e.g. 120"
            defaultValue={bpmMin}
            key={`bmin-${bpmMin}`}
            className="rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-600"
            onBlur={(e) => update({ bpm_min: e.target.value.trim() || null })}
            disabled={pending}
          />
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-zinc-600 dark:text-zinc-400">
          BPM max
          <input
            type="number"
            inputMode="numeric"
            placeholder="e.g. 128"
            defaultValue={bpmMax}
            key={`bmax-${bpmMax}`}
            className="rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-600"
            onBlur={(e) => update({ bpm_max: e.target.value.trim() || null })}
            disabled={pending}
          />
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-zinc-600 dark:text-zinc-400">
          Clean / explicit
          <select
            value={explicit}
            className="rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-600"
            onChange={(e) => update({ explicit: e.target.value || null })}
            disabled={pending}
          >
            <option value="">Any</option>
            <option value="clean">Clean</option>
            <option value="explicit">Explicit</option>
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-zinc-600 dark:text-zinc-400">
          Sort
          <select
            value={sortOptions.some((o) => o.value === sort) ? sort : "newest"}
            className="rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-600"
            onChange={(e) => update({ sort: e.target.value || null })}
            disabled={pending}
          >
            {sortOptions.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
      </div>
      {pending ? <p className="text-xs text-zinc-500">Updating…</p> : null}
    </div>
  );
}
