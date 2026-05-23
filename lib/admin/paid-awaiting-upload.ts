import "server-only";

import { getSiteUrl } from "@/lib/billing/site-url";
import { isSubmissionPayment, type SubmissionPaymentForUpload } from "@/lib/billing/submission-upload-links";
import type { SupabaseClient } from "@supabase/supabase-js";

export type PaidAwaitingUploadRow = {
  paymentId: string;
  paidAt: string;
  planLabel: string;
  artistId: string;
  artistName: string;
  trackId: string;
  trackTitle: string;
  fileCount: number;
  artistEditUrl: string;
};

function firstPlanLabel(
  rel: { label: string | null } | { label: string | null }[] | null,
): string {
  if (rel == null) return "Submission";
  const row = Array.isArray(rel) ? rel[0] : rel;
  return row?.label?.trim() || "Submission";
}

function firstArtistName(
  rel: { display_name: string | null } | { display_name: string | null }[] | null,
): string {
  if (rel == null) return "—";
  const row = Array.isArray(rel) ? rel[0] : rel;
  return row?.display_name?.trim() || "—";
}

/**
 * Succeeded submission payments tied to draft tracks (artist has not submitted for review).
 */
export async function loadPaidAwaitingUploadRows(
  supabase: SupabaseClient,
): Promise<{ rows: PaidAwaitingUploadRow[]; error: string | null }> {
  const { data: payments, error } = await supabase
    .from("payments")
    .select(
      `
      id,
      status,
      updated_at,
      created_at,
      track_id,
      stripe_checkout_session_id,
      artist_id,
      pricing_plans ( label, plan_kind, slug ),
      artists ( display_name ),
      tracks ( id, title, is_draft )
    `,
    )
    .eq("status", "succeeded")
    .not("track_id", "is", null)
    .order("updated_at", { ascending: false })
    .limit(200);

  if (error) return { rows: [], error: error.message };

  const site = getSiteUrl();
  const candidates: {
    paymentId: string;
    paidAt: string;
    planLabel: string;
    artistId: string;
    artistName: string;
    trackId: string;
    trackTitle: string;
  }[] = [];

  for (const raw of payments ?? []) {
    const p = raw as {
      id: string;
      status: string;
      updated_at: string;
      created_at: string;
      track_id: string | null;
      stripe_checkout_session_id: string | null;
      artist_id: string;
      pricing_plans: PaidAwaitingUploadRow extends never ? never : unknown;
      artists: { display_name: string | null } | { display_name: string | null }[] | null;
      tracks:
        | { id: string; title: string | null; is_draft: boolean }
        | { id: string; title: string | null; is_draft: boolean }[]
        | null;
    };

    if (!isSubmissionPayment(p as SubmissionPaymentForUpload)) continue;

    const trackRel = p.tracks;
    const track = Array.isArray(trackRel) ? trackRel[0] : trackRel;
    if (!track?.id || !track.is_draft) continue;

    candidates.push({
      paymentId: p.id,
      paidAt: p.updated_at || p.created_at,
      planLabel: firstPlanLabel(
        p.pricing_plans as { label: string | null } | { label: string | null }[] | null,
      ),
      artistId: p.artist_id,
      artistName: firstArtistName(p.artists),
      trackId: track.id,
      trackTitle: track.title?.trim() || "Untitled draft",
    });
  }

  const trackIds = [...new Set(candidates.map((c) => c.trackId))];
  const fileCountByTrack = new Map<string, number>();

  if (trackIds.length > 0) {
    const { data: files } = await supabase
      .from("track_files")
      .select("track_id")
      .in("track_id", trackIds);

    for (const f of files ?? []) {
      const tid = (f as { track_id: string }).track_id;
      fileCountByTrack.set(tid, (fileCountByTrack.get(tid) ?? 0) + 1);
    }
  }

  const rows: PaidAwaitingUploadRow[] = candidates.map((c) => ({
    ...c,
    fileCount: fileCountByTrack.get(c.trackId) ?? 0,
    artistEditUrl: `${site}/artist/tracks/${c.trackId}/edit`,
  }));

  return { rows, error: null };
}
