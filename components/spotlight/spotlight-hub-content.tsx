import Link from "next/link";
import {
  SPOTLIGHT_SECTION_LABELS,
  isEditorialSpotlightSection,
  type SpotlightSection,
  type SpotlightSectionId,
} from "@/lib/spotlight/load-spotlight-hub";
import { SpotlightHero, SpotlightRow, SpotlightCardGrid } from "@/components/spotlight/spotlight-cards";

const ROW_SECTIONS: SpotlightSectionId[] = [
  "dj_pick",
  "new_release",
  "artist_spotlight",
  "must_spin",
  "sponsored",
  "trending",
  "most_downloaded",
  "most_feedback",
];

/** Single-slot editorial picks — shown together in one horizontal row on marketing pages. */
const EDITORIAL_CARD_SECTIONS: SpotlightSectionId[] = [
  "dj_pick",
  "new_release",
  "artist_spotlight",
  "must_spin",
];

const SECTION_SUBTITLES: Partial<Record<SpotlightSectionId, string>> = {
  dj_pick: "Hand-picked by the Digital Service Pack team.",
  new_release: "Fresh approved packs worth a first listen.",
  artist_spotlight: "A standout artist we're highlighting this week.",
  must_spin: "Records our team says belong in your next set.",
  trending: "Tracks getting the most DJ attention right now.",
  most_downloaded: "Popular packs DJs are grabbing from the catalog.",
  most_feedback: "Tracks with the most DJ feedback and ratings.",
};

export function SpotlightHubContent({
  sections,
  linkMode,
  variant = "featured",
  showSponsoredCta = false,
  showEmptyEditorialSections = false,
  error,
}: {
  sections: SpotlightSection[];
  linkMode: "public" | "dj";
  variant?: "home" | "featured" | "dj";
  showSponsoredCta?: boolean;
  showEmptyEditorialSections?: boolean;
  error?: string | null;
}) {
  const rotw = sections.find((s) => s.id === "record_of_week")?.items[0] ?? null;
  const visibleRows = ROW_SECTIONS.map((id) => {
    const sec = sections.find((s) => s.id === id);
    return sec ?? { id, items: [] };
  }).filter((sec) => {
    if (sec.items.length > 0) return true;
    return showEmptyEditorialSections && isEditorialSpotlightSection(sec.id) && sec.id !== "record_of_week";
  });
  const hasContent =
    rotw != null ||
    visibleRows.some((s) => s.items.length > 0) ||
    (showEmptyEditorialSections && visibleRows.some((s) => isEditorialSpotlightSection(s.id)));

  if (error) {
    return (
      <p className="text-sm text-red-600 dark:text-red-400">
        Could not load spotlight hub{error ? `: ${error}` : ""}. Ensure migration{" "}
        <code className="rounded bg-zinc-100 px-1 text-xs dark:bg-zinc-900">20260531200000_editorial_spotlights</code>{" "}
        is applied.
      </p>
    );
  }

  if (!hasContent) {
    if (variant === "home") return null;
    return (
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        Nothing in the spotlight hub right now. Check back soon — or browse the full catalog after you sign in as a DJ.
      </p>
    );
  }

  const gapClass = variant === "home" ? "gap-10" : variant === "dj" ? "gap-8" : "gap-12";
  const hideSponsoredPaidCopy = variant === "dj";
  const useEditorialRow = variant === "featured" || variant === "home";

  const editorialCardSections = useEditorialRow
    ? visibleRows.filter((s) => EDITORIAL_CARD_SECTIONS.includes(s.id) && s.items.length > 0)
    : [];
  const blockRows = useEditorialRow
    ? visibleRows.filter((s) => !EDITORIAL_CARD_SECTIONS.includes(s.id))
    : visibleRows;
  const editorialGridItems = editorialCardSections.flatMap((sec) =>
    sec.items.map((item) => ({ item, sectionId: sec.id }))
  );

  return (
    <div className={`flex flex-col ${gapClass}`}
    >
      {variant === "home" ? (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between"
        >
          <div>
            <p className="dj-kicker dj-eyebrow">Spotlight hub</p>
            <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">Featured on Discover</h2>
            <p className="mt-2 max-w-xl text-sm text-zinc-600 dark:text-zinc-400">
              A preview of editorial picks and featured artists — see the full list on How it works.
            </p>
          </div>
          <Link href="/featured#featured-artists" className="dj-btn-ghost shrink-0 self-start sm:self-auto">
            Featured artists →
          </Link>
        </div>
      ) : null}


      {variant === "dj" ? (
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Spotlight picks at the top of Discover — open a pack to preview and download.
        </p>
      ) : null}

      {rotw ? (
        <SpotlightHero
          item={rotw}
          sectionLabel={SPOTLIGHT_SECTION_LABELS.record_of_week}
          linkMode={linkMode}
        />
      ) : null}

      {editorialGridItems.length > 0 ? (
        <SpotlightCardGrid
          entries={editorialGridItems}
          linkMode={linkMode}
          hideSponsoredPaidCopy={hideSponsoredPaidCopy}
          minColumns={editorialGridItems.length}
        />
      ) : null}

      {blockRows.map((sec) => (
        <SpotlightRow
          key={sec.id}
          sectionId={sec.id}
          title={SPOTLIGHT_SECTION_LABELS[sec.id]}
          subtitle={SECTION_SUBTITLES[sec.id]}
          items={sec.items}
          linkMode={linkMode}
          hideSponsoredPaidCopy={hideSponsoredPaidCopy}
          emptyMessage={
            showEmptyEditorialSections && sec.items.length === 0
              ? "No track assigned — use the form above to publish this slot."
              : undefined
          }
        />
      ))}

      {showSponsoredCta ? (
        <p className="text-center text-sm text-zinc-600 dark:text-zinc-400">
          Artists:{" "}
          <Link href="/artist/promote" className="font-medium underline underline-offset-4">
            buy a Featured Spotlight
          </Link>{" "}
          for an approved, catalog-active track.
        </p>
      ) : null}
    </div>
  );
}
