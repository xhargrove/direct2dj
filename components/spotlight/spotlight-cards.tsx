import Link from "next/link";
import {
  SPOTLIGHT_SECTION_LABELS,
  type SpotlightItem,
  type SpotlightSectionId,
} from "@/lib/spotlight/load-spotlight-hub";

const BADGE_STYLES: Record<SpotlightSectionId, string> = {
  record_of_week: "bg-violet-100 text-violet-900 dark:bg-violet-950/60 dark:text-violet-100",
  dj_pick: "bg-cyan-100 text-cyan-950 dark:bg-cyan-950/50 dark:text-cyan-100",
  new_release: "bg-rose-100 text-rose-950 dark:bg-rose-950/50 dark:text-rose-100",
  artist_spotlight: "bg-indigo-100 text-indigo-950 dark:bg-indigo-950/50 dark:text-indigo-100",
  must_spin: "bg-orange-100 text-orange-950 dark:bg-orange-950/50 dark:text-orange-100",
  sponsored: "bg-amber-100 text-amber-950 dark:bg-amber-950/50 dark:text-amber-100",
  trending: "bg-emerald-100 text-emerald-950 dark:bg-emerald-950/50 dark:text-emerald-100",
  most_downloaded: "bg-sky-100 text-sky-950 dark:bg-sky-950/50 dark:text-sky-100",
  most_feedback: "bg-fuchsia-100 text-fuchsia-950 dark:bg-fuchsia-950/50 dark:text-fuchsia-100",
};

function trackHref(trackId: string, linkMode: "public" | "dj"): string {
  if (linkMode === "dj") return `/dj/tracks/${trackId}`;
  return `/login?next=${encodeURIComponent(`/dj/tracks/${trackId}`)}`;
}

function artistLine(item: SpotlightItem): string {
  const credit = item.creditArtistName?.trim();
  const workspace = item.artistDisplayName?.trim();
  if (credit && workspace && credit !== workspace) return `${credit} · ${workspace}`;
  return credit || workspace || "—";
}

export function SpotlightTrackCard({
  item,
  sectionId,
  linkMode,
  size = "default",
}: {
  item: SpotlightItem;
  sectionId: SpotlightSectionId;
  linkMode: "public" | "dj";
  size?: "default" | "compact";
}) {
  const badge = SPOTLIGHT_SECTION_LABELS[sectionId];
  const isSponsored = sectionId === "sponsored";
  const shell =
    size === "compact"
      ? "flex min-w-[14rem] max-w-[16rem] shrink-0 flex-col gap-2 rounded-lg border border-zinc-200 p-3 dark:border-zinc-800"
      : "flex gap-3 rounded-lg border border-zinc-200 p-3 transition hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900";

  const innerLayout = size === "compact" ? "flex flex-col gap-2" : "flex min-w-0 flex-1 gap-3";

  return (
    <Link href={trackHref(item.trackId, linkMode)} className={shell}>
      <div className="flex items-start justify-between gap-2">
        <span
          className={`rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${BADGE_STYLES[sectionId]}`}
        >
          {sectionId === "sponsored" ? "Featured" : badge.split(" ").slice(0, 2).join(" ")}
        </span>
        {isSponsored ? <span className="text-[10px] text-zinc-500">Paid</span> : null}
      </div>
      <div className={innerLayout}>
        <div className={
            size === "compact"
              ? "relative aspect-square w-full overflow-hidden rounded-md bg-zinc-100 dark:bg-zinc-800"
              : "relative h-20 w-20 shrink-0 overflow-hidden rounded-md bg-zinc-100 dark:bg-zinc-800"
          }
        >
          {item.coverSignedUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={item.coverSignedUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full items-center justify-center text-xs text-zinc-500">♪</div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium">{item.title}</p>
          <p className="truncate text-sm text-zinc-600 dark:text-zinc-400">{artistLine(item)}</p>
          <p className="mt-1 text-xs text-zinc-500">
            {[item.genre, item.bpm != null ? `${Math.round(item.bpm)} BPM` : null]
              .filter(Boolean)
              .join(" · ")}
          </p>
          {item.metricLabel && sectionId !== "most_downloaded" ? (
            <p className="mt-1 text-xs font-medium text-zinc-700 dark:text-zinc-300">{item.metricLabel}</p>
          ) : null}
        </div>
      </div>
    </Link>
  );
}

export function SpotlightHero({
  item,
  sectionLabel,
  linkMode,
}: {
  item: SpotlightItem;
  sectionLabel: string;
  linkMode: "public" | "dj";
}) {
  return (
    <Link
      href={trackHref(item.trackId, linkMode)}
      className="group relative overflow-hidden rounded-2xl border border-violet-200/80 bg-gradient-to-br from-violet-950 via-zinc-900 to-zinc-950 p-6 text-white shadow-lg dark:border-violet-500/30 sm:p-8"
    >
      <p className="text-xs font-semibold uppercase tracking-widest text-violet-200">{sectionLabel}</p>
      {item.headline ? <p className="mt-1 text-sm text-violet-100/90">{item.headline}</p> : null}
      <div className="mt-6 flex flex-col gap-6 sm:flex-row sm:items-end">
        <div className="relative h-40 w-40 shrink-0 overflow-hidden rounded-xl ring-2 ring-white/20 sm:h-48 sm:w-48">
          {item.coverSignedUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={item.coverSignedUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full items-center justify-center text-2xl text-white/40">♪</div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">{item.title}</h2>
          <p className="mt-2 text-lg text-zinc-200">{artistLine(item)}</p>
          <p className="mt-2 text-sm text-zinc-400">
            {[item.genre, item.bpm != null ? `${Math.round(item.bpm)} BPM` : null]
              .filter(Boolean)
              .join(" · ")}
          </p>
          {item.youtubeUrl ? (
            <p className="mt-3 text-sm font-medium text-violet-200 underline underline-offset-4">
              Official video on YouTube
            </p>
          ) : null}
          <p className="mt-4 text-sm font-medium text-white/90 group-hover:underline">Open pack →</p>
        </div>
      </div>
    </Link>
  );
}

export function SpotlightRow({
  sectionId,
  title,
  items,
  linkMode,
  subtitle,
  emptyMessage,
}: {
  sectionId: SpotlightSectionId;
  title: string;
  items: SpotlightItem[];
  linkMode: "public" | "dj";
  subtitle?: string;
  emptyMessage?: string;
}) {
  if (items.length === 0) {
    if (!emptyMessage) return null;
    return (
      <section className="flex flex-col gap-3">
        <div className="flex flex-col gap-3">
          <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
          {subtitle ? <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">{subtitle}</p> : null}
          <p className="rounded-lg border border-dashed border-zinc-300 px-4 py-6 text-sm text-zinc-500 dark:border-zinc-700">
            {emptyMessage}
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="flex flex-col gap-3">
      <div>
        <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
        {subtitle ? <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">{subtitle}</p> : null}
        {sectionId === "sponsored" ? (
          <p className="mt-1 text-xs text-zinc-500">Paid placement — clearly labeled for transparency.</p>
        ) : null}
      </div>
      <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-2 sm:mx-0 sm:px-0">
        {items.map((item) => (
          <SpotlightTrackCard
            key={`${sectionId}-${item.trackId}`}
            item={item}
            sectionId={sectionId}
            linkMode={linkMode}
            size="compact"
          />
        ))}
      </div>
    </section>
  );
}
