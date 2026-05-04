export default function DjLoading() {
  return (
    <div className="mx-auto w-full max-w-2xl animate-pulse space-y-6 px-4 py-6">
      <div className="h-9 w-40 rounded-md bg-zinc-200 dark:bg-zinc-800" />
      <div className="h-28 rounded-lg bg-zinc-100 dark:bg-zinc-900" />
      <div className="space-y-3">
        <div className="h-24 rounded-lg bg-zinc-100 dark:bg-zinc-900" />
        <div className="h-24 rounded-lg bg-zinc-100 dark:bg-zinc-900" />
      </div>
    </div>
  );
}
