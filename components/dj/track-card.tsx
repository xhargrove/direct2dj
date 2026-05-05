import Link from "next/link";

export function DjTrackCard({
  id,
  title,
  artistLine,
  genre,
  bpm,
  explicitLabel,
  coverUrl,
  footer,
  href,
}: {
  id: string;
  title: string;
  artistLine: string;
  genre: string;
  bpm: number | null;
  explicitLabel: string;
  coverUrl: string | null;
  footer?: React.ReactNode;
  /** When set (e.g. public marketing page), overrides default `/dj/tracks/:id`. */
  href?: string;
}) {
  const to = href ?? `/dj/tracks/${id}`;
  return (
    <Link
      href={to}
      className="flex gap-3 rounded-lg border border-zinc-200 p-3 transition hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900"
    >
      <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-md bg-zinc-100 dark:bg-zinc-800">
        {coverUrl ? (
          // Signed Supabase URL — not next/image remotePatterns
          // eslint-disable-next-line @next/next/no-img-element
          <img src={coverUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full items-center justify-center text-xs font-medium text-zinc-500">{title.slice(0, 2)}</div>
        )}
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="truncate font-medium">{title}</div>
        <div className="truncate text-sm text-zinc-600 dark:text-zinc-400">{artistLine}</div>
        <div className="flex flex-wrap gap-2 text-xs text-zinc-500">
          <span>{genre}</span>
          {bpm != null ? <span>{Math.round(bpm)} BPM</span> : null}
          <span>{explicitLabel}</span>
        </div>
        {footer ? <div className="mt-1 text-xs text-zinc-500">{footer}</div> : null}
      </div>
    </Link>
  );
}
