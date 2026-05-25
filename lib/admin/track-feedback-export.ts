import type { SupabaseClient } from "@supabase/supabase-js";
import { djTierLabel } from "@/lib/dj/tier-label";
import { buildPlainTextPdf } from "@/lib/export/plain-text-pdf";
import { formatDateTimeDisplay } from "@/lib/format/datetime-display";
import type { CrowdReaction, DjTier } from "@/lib/types/database";

export type TrackFeedbackExportRow = {
  djId: string;
  djDisplayName: string;
  djTier: string;
  djLocation: string;
  ratingScore: number | null;
  clubReady: boolean | null;
  radioReady: boolean | null;
  crowdReaction: string;
  ratingComment: string;
  ratingAt: string;
  feedbackBody: string;
  feedbackStatus: string;
  feedbackAt: string;
};

export type TrackFeedbackExportBundle = {
  trackId: string;
  trackTitle: string;
  creditArtistName: string;
  exportedAt: string;
  basename: string;
  rows: TrackFeedbackExportRow[];
};

type DjJoin = {
  display_name: string | null;
  city: string | null;
  state: string | null;
  dj_tier: DjTier | null;
};

type FeedbackQueryRow = {
  id: string;
  body: string;
  moderation_status: string;
  created_at: string;
  dj_id: string;
  djs: DjJoin | DjJoin[] | null;
};

type RatingQueryRow = {
  score: number;
  club_ready: boolean | null;
  radio_ready: boolean | null;
  rating_comment: string | null;
  crowd_reaction: CrowdReaction | null;
  created_at: string;
  dj_id: string;
  djs: DjJoin | DjJoin[] | null;
};

function firstDj(djs: DjJoin | DjJoin[] | null): DjJoin | null {
  if (!djs) return null;
  return Array.isArray(djs) ? (djs[0] ?? null) : djs;
}

function djDisplayName(djId: string, djs: DjJoin | DjJoin[] | null): string {
  const dj = firstDj(djs);
  const name = dj?.display_name?.trim();
  if (name) return name;
  return `DJ #${djId.replace(/-/g, "").slice(0, 8)}`;
}

function djLocation(djs: DjJoin | DjJoin[] | null): string {
  const dj = firstDj(djs);
  if (!dj) return "";
  return [dj.city, dj.state].filter(Boolean).join(", ");
}

function exportBasename(title: string, trackId: string): string {
  const slug =
    title
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "track";
  return `${slug}-${trackId.slice(0, 8)}-feedback`;
}

function boolLabel(value: boolean | null): string {
  if (value === true) return "Yes";
  if (value === false) return "No";
  return "";
}

function crowdLabel(value: CrowdReaction | null | undefined): string {
  if (!value) return "";
  return value.replace(/_/g, " ");
}

function escapeCsvCell(value: string): string {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function formatIso(iso: string): string {
  if (!iso) return "";
  return formatDateTimeDisplay(iso);
}

export async function loadTrackFeedbackExport(
  supabase: SupabaseClient,
  trackId: string,
): Promise<{ data: TrackFeedbackExportBundle } | { error: string }> {
  const { data: track, error: trackErr } = await supabase
    .from("tracks")
    .select("id, title, credit_artist_name")
    .eq("id", trackId)
    .maybeSingle();

  if (trackErr || !track) {
    return { error: "Track not found." };
  }

  const [{ data: feedbackRows, error: fbErr }, { data: ratingRows, error: ratingErr }] =
    await Promise.all([
      supabase
        .from("feedback")
        .select(
          "id, body, moderation_status, created_at, dj_id, djs ( display_name, city, state, dj_tier )",
        )
        .eq("track_id", trackId)
        .order("created_at", { ascending: false }),
      supabase
        .from("ratings")
        .select(
          "score, club_ready, radio_ready, rating_comment, crowd_reaction, created_at, dj_id, djs ( display_name, city, state, dj_tier )",
        )
        .eq("track_id", trackId)
        .order("created_at", { ascending: false }),
    ]);

  if (fbErr || ratingErr) {
    return { error: fbErr?.message ?? ratingErr?.message ?? "Could not load feedback." };
  }

  const merged = new Map<string, TrackFeedbackExportRow>();

  for (const row of (ratingRows ?? []) as RatingQueryRow[]) {
    const dj = firstDj(row.djs);
    merged.set(row.dj_id, {
      djId: row.dj_id,
      djDisplayName: djDisplayName(row.dj_id, row.djs),
      djTier: djTierLabel(dj?.dj_tier ?? null),
      djLocation: djLocation(row.djs),
      ratingScore: row.score,
      clubReady: row.club_ready,
      radioReady: row.radio_ready,
      crowdReaction: crowdLabel(row.crowd_reaction),
      ratingComment: row.rating_comment?.trim() ?? "",
      ratingAt: row.created_at,
      feedbackBody: "",
      feedbackStatus: "",
      feedbackAt: "",
    });
  }

  for (const row of (feedbackRows ?? []) as FeedbackQueryRow[]) {
    const existing = merged.get(row.dj_id);
    const dj = firstDj(row.djs);
    const base: TrackFeedbackExportRow = existing ?? {
      djId: row.dj_id,
      djDisplayName: djDisplayName(row.dj_id, row.djs),
      djTier: djTierLabel(dj?.dj_tier ?? null),
      djLocation: djLocation(row.djs),
      ratingScore: null,
      clubReady: null,
      radioReady: null,
      crowdReaction: "",
      ratingComment: "",
      ratingAt: "",
      feedbackBody: "",
      feedbackStatus: "",
      feedbackAt: "",
    };

    merged.set(row.dj_id, {
      ...base,
      djDisplayName: base.djDisplayName || djDisplayName(row.dj_id, row.djs),
      djTier: base.djTier !== "—" ? base.djTier : djTierLabel(dj?.dj_tier ?? null),
      djLocation: base.djLocation || djLocation(row.djs),
      feedbackBody: row.body.trim(),
      feedbackStatus: row.moderation_status,
      feedbackAt: row.created_at,
    });
  }

  const rows = [...merged.values()].sort((a, b) =>
    a.djDisplayName.localeCompare(b.djDisplayName, "en"),
  );

  const title = track.title?.trim() || "Untitled";
  return {
    data: {
      trackId: track.id,
      trackTitle: title,
      creditArtistName: track.credit_artist_name?.trim() ?? "",
      exportedAt: new Date().toISOString(),
      basename: exportBasename(title, track.id),
      rows,
    },
  };
}

const CSV_HEADERS = [
  "dj_name",
  "dj_tier",
  "dj_location",
  "rating_score",
  "club_ready",
  "radio_ready",
  "crowd_reaction",
  "rating_comment",
  "rating_at",
  "feedback_body",
  "feedback_status",
  "feedback_at",
] as const;

function rowToCsvCells(row: TrackFeedbackExportRow): string[] {
  return [
    row.djDisplayName,
    row.djTier,
    row.djLocation,
    row.ratingScore != null ? String(row.ratingScore) : "",
    boolLabel(row.clubReady),
    boolLabel(row.radioReady),
    row.crowdReaction,
    row.ratingComment,
    formatIso(row.ratingAt),
    row.feedbackBody,
    row.feedbackStatus,
    formatIso(row.feedbackAt),
  ];
}

export function serializeFeedbackCsv(bundle: TrackFeedbackExportBundle): string {
  const lines = [
    CSV_HEADERS.join(","),
    ...bundle.rows.map((row) => rowToCsvCells(row).map(escapeCsvCell).join(",")),
  ];
  return `\uFEFF${lines.join("\r\n")}\r\n`;
}

export function serializeFeedbackText(bundle: TrackFeedbackExportBundle): string {
  const header = [
    "Track feedback export",
    `Track: ${bundle.trackTitle}`,
    bundle.creditArtistName ? `Credit: ${bundle.creditArtistName}` : null,
    `Track ID: ${bundle.trackId}`,
    `Exported: ${formatIso(bundle.exportedAt)}`,
    `Rows: ${bundle.rows.length}`,
    "",
  ]
    .filter((line): line is string => line != null)
    .join("\n");

  if (bundle.rows.length === 0) {
    return `${header}No ratings or feedback for this track.\n`;
  }

  const sections = bundle.rows.map((row, index) => {
    const lines = [
      `${"=".repeat(72)}`,
      `DJ ${index + 1}: ${row.djDisplayName}`,
      `Tier: ${row.djTier}`,
      row.djLocation ? `Location: ${row.djLocation}` : null,
      "",
      "Rating",
      row.ratingScore != null ? `  Score: ${row.ratingScore}` : "  Score: —",
      row.clubReady != null ? `  Club ready: ${boolLabel(row.clubReady)}` : null,
      row.radioReady != null ? `  Radio ready: ${boolLabel(row.radioReady)}` : null,
      row.crowdReaction ? `  Crowd reaction: ${row.crowdReaction}` : null,
      row.ratingComment ? `  Comment: ${row.ratingComment}` : null,
      row.ratingAt ? `  Submitted: ${formatIso(row.ratingAt)}` : null,
      "",
      "Feedback",
      row.feedbackBody ? `  ${row.feedbackBody.replace(/\n/g, "\n  ")}` : "  —",
      row.feedbackStatus ? `  Status: ${row.feedbackStatus}` : null,
      row.feedbackAt ? `  Submitted: ${formatIso(row.feedbackAt)}` : null,
      "",
    ];
    return lines.filter((line): line is string => line != null).join("\n");
  });

  return `${header}${sections.join("\n")}`;
}

export function serializeFeedbackPdf(bundle: TrackFeedbackExportBundle): Uint8Array {
  return buildPlainTextPdf(serializeFeedbackText(bundle));
}
