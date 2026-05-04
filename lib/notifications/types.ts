/** Stored in `notifications.kind`. Stable strings for filtering and product analytics. */
export type NotificationKind =
  | "track_approved"
  | "track_rejected"
  | "track_downloaded"
  | "track_rated"
  | "track_rating_updated"
  | "track_feedback"
  | "track_play_reported"
  | "play_verified_admin"
  | "play_verified_dj_monitor_pro"
  | "featured_started_artist"
  | "featured_expired_artist"
  | "featured_new_for_dj"
  | "rated_track_updated"
  | "dj_application_approved"
  | "dj_application_rejected";
