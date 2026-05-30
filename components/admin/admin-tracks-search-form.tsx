import Link from "next/link";

export function AdminTracksSearchForm({ q }: { q: string }) {
  return (
    <form method="get" className="flex flex-col gap-2 sm:flex-row sm:items-end">
      <label className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">Search tracks</span>
        <input
          type="search"
          name="q"
          defaultValue={q}
          placeholder="Title, release artist, account name, or track ID"
          className="min-h-10 w-full rounded-md border border-zinc-300 px-3 text-sm dark:border-zinc-600 dark:bg-zinc-950"
        />
      </label>
      <div className="flex shrink-0 gap-2">
        <button
          type="submit"
          className="inline-flex min-h-10 items-center justify-center rounded-md border border-zinc-300 bg-white px-4 text-sm font-medium text-zinc-900 hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800"
        >
          Search
        </button>
        {q ? (
          <Link
            href="/admin/tracks"
            className="inline-flex min-h-10 items-center justify-center rounded-md px-4 text-sm font-medium text-zinc-600 underline-offset-4 hover:underline dark:text-zinc-400"
          >
            Clear
          </Link>
        ) : null}
      </div>
    </form>
  );
}
