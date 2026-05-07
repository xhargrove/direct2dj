import { notFound } from "next/navigation";
import { unstable_noStore as noStore } from "next/cache";
import { TrackDetailPanel } from "@/components/dj/track-detail-panel";
import { feedbackQualifiesForDownload } from "@/lib/dj/catalog-validation";
import { signCoverPaths } from "@/lib/dj/cover-sign";
import { createClient } from "@/lib/supabase/server";
import type { CrowdReaction, Track } from "@/lib/types/database";

type Props = { params: Promise<{ id: string }> };

export default async function DjTrackDetailPage({ params }: Props) {
  noStore();
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) notFound();

  const { data: rawTrack, error } = await supabase
    .from("tracks")
    .select(
      `
      *,
      artists ( id, display_name, status )
    `,
    )
    .eq("id", id)
    .maybeSingle();

  if (error || !rawTrack) {
    notFound();
  }

  const track = rawTrack as Track & {
    artists: { display_name: string; status: string } | null;
  };

  const { data: dj } = await supabase.from("djs").select("id").eq("profile_id", user.id).maybeSingle();
  if (!dj) notFound();

  const { data: myRatingRow } = await supabase
    .from("ratings")
    .select("score, club_ready, radio_ready, rating_comment, crowd_reaction")
    .eq("track_id", id)
    .eq("dj_id", dj.id)
    .maybeSingle();

  const { data: myFeedbackRow } = await supabase
    .from("feedback")
    .select("body, moderation_status")
    .eq("track_id", id)
    .eq("dj_id", dj.id)
    .maybeSingle();

  const { data: coverRow } = await supabase
    .from("track_files")
    .select("storage_path")
    .eq("track_id", id)
    .eq("pack_slot", "cover_art")
    .maybeSingle();

  const coverMap = await signCoverPaths(supabase, [coverRow?.storage_path]);
  const coverSignedUrl = coverRow?.storage_path ? coverMap.get(coverRow.storage_path) ?? null : null;

  const creditLine = track.credit_artist_name
    ? `${track.credit_artist_name}${track.artists?.display_name ? ` · ${track.artists.display_name}` : ""}`
    : track.artists?.display_name ?? "";

  const initialRating = {
    score: myRatingRow?.score ?? null,
    club_ready: myRatingRow?.club_ready ?? null,
    radio_ready: myRatingRow?.radio_ready ?? null,
    rating_comment: myRatingRow?.rating_comment ?? null,
    crowd_reaction: (myRatingRow?.crowd_reaction as CrowdReaction | null) ?? null,
  };

  const downloadAllowed = feedbackQualifiesForDownload(
    typeof myFeedbackRow?.body === "string" ? myFeedbackRow.body : null,
  );

  return (
    <div className="mx-auto w-full max-w-2xl">
      <TrackDetailPanel
        trackId={track.id}
        title={track.title}
        creditLine={creditLine}
        genre={track.genre}
        bpm={track.bpm != null ? Number(track.bpm) : null}
        musicalKey={track.musical_key}
        explicitLabel={track.explicit_rating === "explicit" ? "Explicit" : "Clean"}
        releaseDate={track.release_date}
        description={track.description}
        coverSignedUrl={coverSignedUrl}
        initialRating={initialRating}
        initialFeedbackBody={typeof myFeedbackRow?.body === "string" ? myFeedbackRow.body : ""}
        feedbackModerationStatus={
          typeof myFeedbackRow?.moderation_status === "string" ? myFeedbackRow.moderation_status : null
        }
        downloadAllowed={downloadAllowed}
      />
    </div>
  );
}
