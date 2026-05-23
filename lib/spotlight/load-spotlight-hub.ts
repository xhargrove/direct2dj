import "server-only";

import { signCoverPaths } from "@/lib/dj/cover-sign";
import { createServiceRoleClientOrNull } from "@/lib/supabase/service-role";
import { createClient } from "@/lib/supabase/server";

export type SpotlightSectionId =
  | "record_of_week"
  | "dj_pick"
  | "new_release"
  | "artist_spotlight"
  | "must_spin"
  | "sponsored"
  | "trending"
  | "most_downloaded"
  | "most_feedback";

/** Admin-assignable editorial slots (one active track each via Backstage → Spotlights). */
export const EDITORIAL_SPOTLIGHT_SECTION_IDS = [
  "record_of_week",
  "dj_pick",
  "new_release",
  "artist_spotlight",
  "must_spin",
] as const;

export type EditorialSpotlightSectionId = (typeof EDITORIAL_SPOTLIGHT_SECTION_IDS)[number];

export function isEditorialSpotlightSection(id: SpotlightSectionId): id is EditorialSpotlightSectionId {
  return (EDITORIAL_SPOTLIGHT_SECTION_IDS as readonly string[]).includes(id);
}

export type SpotlightItem = {
  section: SpotlightSectionId;
  editorialId: string | null;
  headline: string | null;
  trackId: string;
  title: string;
  creditArtistName: string | null;
  genre: string | null;
  bpm: number | null;
  explicitRating: string | null;
  artistDisplayName: string | null;
  coverStoragePath: string | null;
  coverSignedUrl: string | null;
  youtubeUrl: string | null;
  metricValue: number | null;
  metricLabel: string | null;
  placementId: string | null;
};

export type SpotlightSection = {
  id: SpotlightSectionId;
  items: SpotlightItem[];
};

export const SPOTLIGHT_SECTION_ORDER: SpotlightSectionId[] = [
  "record_of_week",
  "dj_pick",
  "new_release",
  "artist_spotlight",
  "must_spin",
  "sponsored",
  "trending",
  "most_downloaded",
  "most_feedback",
];

export const SPOTLIGHT_SECTION_LABELS: Record<SpotlightSectionId, string> = {
  record_of_week: "Featured Record of the Week",
  dj_pick: "DSP DJ Pick",
  new_release: "New Release Spotlight",
  artist_spotlight: "Featured Artist",
  must_spin: "Must Spin",
  sponsored: "Featured Spotlight",
  trending: "Trending With DJs",
  most_downloaded: "Most Downloaded",
  most_feedback: "Most Feedback",
};

/** Minimum items before showing algorithmic sections (plan: hide empty trending until ≥3). */
export const SPOTLIGHT_MIN_ALGORITHMIC = 3;

type RawRow = {
  section: string;
  editorial_id: string | null;
  headline: string | null;
  track_id: string;
  title: string;
  credit_artist_name: string | null;
  genre: string | null;
  bpm: number | null;
  explicit_rating: string | null;
  artist_display_name: string | null;
  cover_storage_path: string | null;
  youtube_url: string | null;
  metric_value: number | null;
  metric_label: string | null;
  placement_id: string | null;
};

function isSectionId(s: string): s is SpotlightSectionId {
  return (
    s === "record_of_week" ||
    s === "dj_pick" ||
    s === "new_release" ||
    s === "artist_spotlight" ||
    s === "must_spin" ||
    s === "sponsored" ||
    s === "trending" ||
    s === "most_downloaded" ||
    s === "most_feedback"
  );
}

function mapRow(r: RawRow): SpotlightItem {
  return {
    section: r.section as SpotlightSectionId,
    editorialId: r.editorial_id,
    headline: r.headline,
    trackId: r.track_id,
    title: r.title,
    creditArtistName: r.credit_artist_name,
    genre: r.genre,
    bpm: r.bpm != null ? Number(r.bpm) : null,
    explicitRating: r.explicit_rating,
    artistDisplayName: r.artist_display_name,
    coverStoragePath: r.cover_storage_path,
    coverSignedUrl: null,
    youtubeUrl: r.youtube_url,
    metricValue: r.metric_value != null ? Number(r.metric_value) : null,
    metricLabel: r.metric_label,
    placementId: r.placement_id,
  };
}

/** Dedupe tracks across sections: editorial slots (in order) > Featured Spotlight > algorithmic. */
export function dedupeSpotlightSections(sections: SpotlightSection[]): SpotlightSection[] {
  const seen = new Set<string>();

  return SPOTLIGHT_SECTION_ORDER.map((id) => {
    const sec = sections.find((s) => s.id === id);
    if (!sec) return { id, items: [] };
    const items = sec.items.filter((item) => {
      if (seen.has(item.trackId)) return false;
      seen.add(item.trackId);
      return true;
    });
    return { id, items };
  });
}

export function filterSpotlightSectionsForDisplay(sections: SpotlightSection[]): SpotlightSection[] {
  return sections.filter((sec) => {
    if (sec.id === "trending" || sec.id === "most_downloaded" || sec.id === "most_feedback") {
      return sec.items.length >= SPOTLIGHT_MIN_ALGORITHMIC;
    }
    if (isEditorialSpotlightSection(sec.id)) {
      return sec.items.length >= 1;
    }
    return sec.items.length >= 1;
  });
}

export async function loadSpotlightHub(options?: {
  limitPerSection?: number;
  filterEmpty?: boolean;
  dedupe?: boolean;
}): Promise<{ sections: SpotlightSection[]; error: string | null }> {
  const limit = options?.limitPerSection ?? 8;
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("public_spotlight_hub", {
    p_limit_per_section: limit,
  });

  if (error) return { sections: [], error: error.message };

  const rows = (data ?? []) as RawRow[];
  const grouped = new Map<SpotlightSectionId, SpotlightItem[]>();

  for (const id of SPOTLIGHT_SECTION_ORDER) {
    grouped.set(id, []);
  }

  for (const raw of rows) {
    if (!isSectionId(raw.section)) continue;
    grouped.get(raw.section)!.push(mapRow(raw));
  }

  let sections: SpotlightSection[] = SPOTLIGHT_SECTION_ORDER.map((id) => ({
    id,
    items: grouped.get(id) ?? [],
  }));

  if (options?.dedupe !== false) {
    sections = dedupeSpotlightSections(sections);
  }

  if (options?.filterEmpty !== false) {
    sections = filterSpotlightSectionsForDisplay(sections);
  }

  const paths = sections.flatMap((s) => s.items.map((i) => i.coverStoragePath).filter(Boolean)) as string[];
  const sr = createServiceRoleClientOrNull();
  const coverMap = await signCoverPaths(sr ?? supabase, paths);

  sections = sections.map((sec) => ({
    ...sec,
    items: sec.items.map((item) => ({
      ...item,
      coverSignedUrl: item.coverStoragePath ? coverMap.get(item.coverStoragePath) ?? null : null,
    })),
  }));

  return { sections, error: null };
}

export function spotlightTrackIds(sections: SpotlightSection[]): string[] {
  return [...new Set(sections.flatMap((s) => s.items.map((i) => i.trackId)))];
}
