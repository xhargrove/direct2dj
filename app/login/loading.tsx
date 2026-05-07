/** Shown while the async login page resolves (Supabase session + optional redirect). Streams immediately so client navigations do not hit empty RSC payloads. */
export default function LoginLoading() {
  return (
    <div className="flex min-h-full flex-1 flex-col items-center justify-center px-4 py-10">
      <div className="mb-8 flex flex-col items-center gap-2 text-center">
        <div
          className="dj-brand h-14 w-14 animate-pulse rounded-2xl bg-zinc-200 dark:bg-zinc-700"
          aria-hidden
        />
        <div className="h-5 w-56 animate-pulse rounded bg-zinc-200 dark:bg-zinc-700" />
        <div className="h-4 w-64 max-w-xs animate-pulse rounded bg-zinc-100 dark:bg-zinc-800" />
      </div>
      <div className="dj-card w-full max-w-md space-y-4 p-6 sm:p-9">
        <div className="h-10 w-full animate-pulse rounded-lg bg-zinc-100 dark:bg-zinc-800" />
        <div className="h-10 w-full animate-pulse rounded-lg bg-zinc-100 dark:bg-zinc-800" />
        <div className="h-11 w-full animate-pulse rounded-lg bg-zinc-200/80 dark:bg-zinc-700" />
      </div>
      <div className="mt-8 h-4 w-28 animate-pulse rounded bg-zinc-100 dark:bg-zinc-800" />
    </div>
  );
}
