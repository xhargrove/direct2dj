import Link from "next/link";

type CardVariant = "default" | "featured";

const variantShell: Record<CardVariant, string> = {
  default:
    "flex gap-3 rounded-lg border border-zinc-200 p-3 transition hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900",
  featured:
    "flex gap-4 rounded-xl border-2 border-amber-200/80 bg-gradient-to-br from-amber-50/90 to-white p-4 shadow-md shadow-amber-900/5 transition hover:border-amber-300 hover:shadow-lg dark:border-amber-500/30 dark:from-amber-950/25 dark:to-zinc-950/80 dark:hover:border-amber-500/50 sm:gap-5 sm:p-5",
};

const variantCover: Record<CardVariant, string> = {
  default: "relative h-20 w-20 shrink-0 overflow-hidden rounded-md bg-zinc-100 dark:bg-zinc-800",
  featured:
    "relative h-28 w-28 shrink-0 overflow-hidden rounded-lg bg-zinc-100 ring-2 ring-amber-200/60 dark:bg-zinc-800 dark:ring-amber-500/20 sm:h-36 sm:w-36",
};

const variantTitle: Record<CardVariant, string> = {
  default: "truncate font-medium",
  featured: "line-clamp-2 text-lg font-semibold leading-snug sm:text-xl",
};

const variantArtist: Record<CardVariant, string> = {
  default: "truncate text-sm text-zinc-600 dark:text-zinc-400",
  featured: "line-clamp-2 text-base text-zinc-700 dark:text-zinc-300 sm:text-lg",
};

const variantMeta: Record<CardVariant, string> = {
  default: "flex flex-wrap gap-2 text-xs text-zinc-500",
  featured: "flex flex-wrap gap-x-3 gap-y-1 text-sm font-medium text-zinc-600 dark:text-zinc-400",
};

const variantFooter: Record<CardVariant, string> = {
  default: "mt-1 text-xs text-zinc-500",
  featured: "mt-1 text-sm font-semibold",
};

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
  variant = "default",
  labelRosterRelease,
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
  /** Larger card for Discover featured placements. */
  variant?: CardVariant;
  /** Label-managed roster promo (distinct from indie artist uploads). */
  labelRosterRelease?: boolean;
}) {
  const to = href ?? `/dj/tracks/${id}`;
  const v = variant;
  return (
    <Link href={to} className={variantShell[v]}>
      <div className={variantCover[v]}>
        {coverUrl ? (
          // Signed Supabase URL — not next/image remotePatterns
          // eslint-disable-next-line @next/next/no-img-element
          <img src={coverUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          <div
            className={
              v === "featured"
                ? "flex h-full items-center justify-center text-sm font-semibold text-zinc-500 sm:text-base"
                : "flex h-full items-center justify-center text-xs font-medium text-zinc-500"
            }
          >
            {title.slice(0, 2)}
          </div>
        )}
      </div>
      <div className={`flex min-w-0 flex-1 flex-col ${v === "featured" ? "gap-1.5 justify-center" : "gap-1"}`}>
        <div className={variantTitle[v]}>{title}</div>
        <div className={variantArtist[v]}>{artistLine}</div>
        <div className={variantMeta[v]}>
          {labelRosterRelease ? (
            <span className="rounded-full bg-violet-100 px-2 py-0.5 font-semibold text-violet-800 dark:bg-violet-950/50 dark:text-violet-200">
              Label roster
            </span>
          ) : null}
          {genre ? <span>{genre}</span> : null}
          {bpm != null ? <span>{Math.round(bpm)} BPM</span> : null}
          <span>{explicitLabel}</span>
        </div>
        {footer ? <div className={variantFooter[v]}>{footer}</div> : null}
      </div>
    </Link>
  );
}
