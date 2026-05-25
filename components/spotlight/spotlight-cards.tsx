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

function spotlightBadgeLabel(sectionId: SpotlightSectionId, fullLabel: string): string {
  if (sectionId === "sponsored") return "Featured";
  const words = fullLabel.split(/\s+/);
  if (sectionId === "trending") return "Trending with";
  if (sectionId === "most_downloaded") return "Most downloaded";
  if (sectionId === "most_feedback") return "Most feedback";
  return words.slice(0, 2).join(" ");
}

export type SpotlightDensity = "default" | "compact";

export function SpotlightTrackCard({
  item,
  sectionId,
  linkMode,
  size = "grid",
  density = "default",
  hideSponsoredPaidCopy = false,
}: {
  item: SpotlightItem;
  sectionId: SpotlightSectionId;
  linkMode: "public" | "dj";
  size?: "grid" | "list";
  density?: SpotlightDensity;
  hideSponsoredPaidCopy?: boolean;
}) {
  const badge = SPOTLIGHT_SECTION_LABELS[sectionId];
  const isSponsored = sectionId === "sponsored";
  const isGrid = size === "grid";
  const compact = density === "compact";

  const shell = isGrid
    ? compact
      ? "flex min-w-0 flex-col gap-1.5 rounded-md border border-zinc-200/80 bg-zinc-50/80 p-2 transition hover:bg-zinc-100 dark:border-zinc-700/80 dark:bg-zinc-900/60 dark:hover:bg-zinc-900"
      : "flex min-w-0 flex-col gap-2.5 rounded-lg border border-cyan-500/15 bg-zinc-950/50 p-3 transition hover:border-cyan-400/30 hover:bg-zinc-900/80 dark:border-cyan-400/20"
    : "flex w-full items-stretch gap-4 rounded-lg border border-zinc-200 p-4 transition hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900";

  if (isGrid) {
    return (
      <Link href={trackHref(item.trackId, linkMode)} className={shell}>
        <div className="flex items-start justify-between gap-1.5">
          <span
            className={`rounded px-1.5 py-0.5 font-semibold uppercase tracking-wide ${compact ? "text-[9px]" : "text-[10px]"} ${BADGE_STYLES[sectionId]}`}
          >
            {spotlightBadgeLabel(sectionId, badge)}
          </span>
          {isSponsored && !hideSponsoredPaidCopy ? (
            <span className="text-[9px] text-zinc-500">Paid</span>
          ) : null}
        </div>
        <div
          className={
            compact
              ? "relative h-20 w-full overflow-hidden rounded bg-zinc-200 dark:bg-zinc-800"
              : "relative aspect-square w-full overflow-hidden rounded-md bg-zinc-800"
          }
        >
          {item.coverSignedUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={item.coverSignedUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full items-center justify-center text-xs text-zinc-500">♪</div>
          )}
        </div>
        <div className="min-w-0">
          <p className={`truncate font-medium ${compact ? "text-sm text-zinc-900 dark:text-zinc-100" : "font-semibold text-zinc-50"}`}>
            {item.title}
          </p>
          <p className={`truncate text-zinc-600 dark:text-zinc-400 ${compact ? "text-xs" : "text-sm"}`}>{artistLine(item)}</p>
          <p className={`text-zinc-500 ${compact ? "text-[11px]" : "mt-1 text-xs"}`}>
            {[item.genre, item.bpm != null ? `${Math.round(item.bpm)} BPM` : null]
              .filter(Boolean)
              .join(" · ")}
          </p>
          {item.metricLabel && sectionId !== "most_downloaded" && !(hideSponsoredPaidCopy && isSponsored) ? (
            <p className={`text-zinc-500 ${compact ? "text-[11px]" : "mt-1 text-xs"}`}>{item.metricLabel}</p>
          ) : null}
        </div>
      </Link>
    );
  }

  return (
    <Link href={trackHref(item.trackId, linkMode)} className={shell}>
      <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-md bg-zinc-100 sm:h-24 sm:w-24 dark:bg-zinc-800">
        {item.coverSignedUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={item.coverSignedUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full items-center justify-center text-xs text-zinc-500">♪</div>
        )}
      </div>
      <div className="flex min-w-0 flex-1 flex-col justify-center gap-1">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${BADGE_STYLES[sectionId]}`}
          >
            {sectionId === "sponsored" ? "Featured" : spotlightBadgeLabel(sectionId, badge)}
          </span>
          {isSponsored && !hideSponsoredPaidCopy ? (
            <span className="text-[10px] text-zinc-500">Paid</span>
          ) : null}
        </div>
        <p className="truncate font-medium">{item.title}</p>
        <p className="truncate text-sm text-zinc-600 dark:text-zinc-400">{artistLine(item)}</p>
        <p className="text-xs text-zinc-500">
          {[item.genre, item.bpm != null ? `${Math.round(item.bpm)} BPM` : null]
            .filter(Boolean)
            .join(" · ")}
        </p>
        {item.metricLabel && sectionId !== "most_downloaded" && !(hideSponsoredPaidCopy && isSponsored) ? (
          <p className="text-xs font-medium text-zinc-700 dark:text-zinc-300">{item.metricLabel}</p>
        ) : null}
      </div>
    </Link>
  );
}

export function SpotlightHero({
  item,
  sectionLabel,
  linkMode,
  density = "default",
}: {
  item: SpotlightItem;
  sectionLabel: string;
  linkMode: "public" | "dj";
  density?: SpotlightDensity;
}) {
  const compact = density === "compact";

  return (
    <Link
      href={trackHref(item.trackId, linkMode)}
      className={
        compact
          ? "group relative overflow-hidden rounded-xl border border-violet-200/60 bg-gradient-to-br from-violet-950 via-zinc-900 to-zinc-950 p-4 text-white dark:border-violet-500/25"
          : "group relative overflow-hidden rounded-2xl border border-violet-200/80 bg-gradient-to-br from-violet-950 via-zinc-900 to-zinc-950 p-6 text-white shadow-lg dark:border-violet-500/30 sm:p-8"
      }
    >
      <p className={`font-semibold uppercase tracking-widest text-violet-200 ${compact ? "text-[10px]" : "text-xs"}`}>
        {sectionLabel}
      </p>
      {item.headline ? (
        <p className={`text-violet-100/90 ${compact ? "mt-0.5 text-xs" : "mt-1 text-sm"}`}>{item.headline}</p>
      ) : null}
      <div className={compact ? "mt-3 flex flex-col gap-4 sm:flex-row sm:items-end" : "mt-6 flex flex-col gap-6 sm:flex-row sm:items-end"}>
        <div
          className={
            compact
              ? "relative h-24 w-24 shrink-0 overflow-hidden rounded-lg ring-1 ring-white/20"
              : "relative h-40 w-40 shrink-0 overflow-hidden rounded-xl ring-2 ring-white/20 sm:h-48 sm:w-48"
          }
        >
          {item.coverSignedUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={item.coverSignedUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full items-center justify-center text-xl text-white/40">♪</div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <h2 className={`font-semibold tracking-tight ${compact ? "text-lg" : "text-2xl sm:text-3xl"}`}>{item.title}</h2>
          <p className={`text-zinc-200 ${compact ? "mt-1 text-sm" : "mt-2 text-lg"}`}>{artistLine(item)}</p>
          <p className={`text-zinc-400 ${compact ? "mt-1 text-xs" : "mt-2 text-sm"}`}>
            {[item.genre, item.bpm != null ? `${Math.round(item.bpm)} BPM` : null]
              .filter(Boolean)
              .join(" · ")}
          </p>
          {item.youtubeUrl ? (
            <p
              className={`font-medium text-violet-200 underline underline-offset-4 ${compact ? "mt-2 text-xs" : "mt-3 text-sm"}`}
            >
              Official video on YouTube
            </p>
          ) : null}
          <p className={`font-medium text-white/90 group-hover:underline ${compact ? "mt-2 text-xs" : "mt-4 text-sm"}`}>
            Open pack →
          </p>
        </div>
      </div>
    </Link>
  );
}

function spotlightGridClass(count: number, density: SpotlightDensity = "default", editorialStrip = false): string {
  if (editorialStrip) {
    if (count <= 1) return "grid max-w-[11rem] grid-cols-1 gap-2 sm:max-w-xs";
    if (count === 2) return "grid grid-cols-2 gap-2";
    if (count === 3) return "grid grid-cols-2 gap-2 sm:grid-cols-3";
    return "grid grid-cols-2 gap-2 sm:grid-cols-4";
  }
  if (density === "compact") {
    if (count <= 1) return "grid grid-cols-1 gap-2";
    return "grid grid-cols-2 gap-2";
  }
  if (count <= 1) return "grid grid-cols-1 gap-3";
  if (count === 2) return "grid grid-cols-1 gap-3 sm:grid-cols-2";
  if (count === 3) return "grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3";
  return "grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4";
}

export function SpotlightCardGrid({
  entries,
  linkMode,
  density = "default",
  editorialStrip = false,
  hideSponsoredPaidCopy = false,
  minColumns = 1,
}: {
  entries: { item: SpotlightItem; sectionId: SpotlightSectionId }[];
  linkMode: "public" | "dj";
  density?: SpotlightDensity;
  /** Four editorial slots in one row (Discover feed + marketing). */
  editorialStrip?: boolean;
  hideSponsoredPaidCopy?: boolean;
  minColumns?: number;
}) {
  const count = Math.max(entries.length, minColumns);
  const cardDensity = editorialStrip ? "default" : density;
  return (
    <div className={spotlightGridClass(count, density, editorialStrip)}>
      {entries.map(({ item, sectionId }) => (
        <SpotlightTrackCard
          key={`${sectionId}-${item.trackId}`}
          item={item}
          sectionId={sectionId}
          linkMode={linkMode}
          size="grid"
          density={cardDensity}
          hideSponsoredPaidCopy={hideSponsoredPaidCopy}
        />
      ))}
    </div>
  );
}

export function SpotlightRow({
  sectionId,
  title,
  items,
  linkMode,
  subtitle,
  emptyMessage,
  density = "default",
  hideSponsoredPaidCopy = false,
}: {
  sectionId: SpotlightSectionId;
  title: string;
  items: SpotlightItem[];
  linkMode: "public" | "dj";
  subtitle?: string;
  emptyMessage?: string;
  density?: SpotlightDensity;
  hideSponsoredPaidCopy?: boolean;
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

  const gridClass = spotlightGridClass(items.length, density);
  const compact = density === "compact";

  return (
    <section className={`flex flex-col ${compact ? "gap-2" : "gap-3"}`}>
      <div>
        <h2
          className={`font-semibold tracking-tight ${compact ? "text-base text-zinc-900 dark:text-zinc-50" : "text-lg text-zinc-50"}`}
        >
          {title}
        </h2>
        {subtitle ? (
          <p className={`text-zinc-600 dark:text-zinc-400 ${compact ? "mt-0.5 text-xs" : "mt-1 text-sm"}`}>{subtitle}</p>
        ) : null}
        {sectionId === "sponsored" && !hideSponsoredPaidCopy ? (
          <p className="mt-1 text-xs text-zinc-500">Paid placement — clearly labeled for transparency.</p>
        ) : null}
      </div>
      <div className={gridClass}>
        {items.map((item) => (
          <SpotlightTrackCard
            key={`${sectionId}-${item.trackId}`}
            item={item}
            sectionId={sectionId}
            linkMode={linkMode}
            size="grid"
            density={density}
            hideSponsoredPaidCopy={hideSponsoredPaidCopy}
          />
        ))}
      </div>
    </section>
  );
}
