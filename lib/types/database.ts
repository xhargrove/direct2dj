import type { UserRole } from "@/lib/types/roles";

export type Profile = {
  id: string;
  email: string | null;
  full_name: string | null;
  avatar_url: string | null;
  role: UserRole;
  created_at: string;
  updated_at: string;
};

export type ApprovalStatus = "pending" | "approved" | "rejected";
export type LifecycleStatus = "active" | "inactive";
export type TrackFileKind = "audio" | "cover" | "stem" | "other";

export type ExplicitRating = "explicit" | "clean";

export type CrowdReaction = "cold" | "warm" | "strong" | "hit_potential";

export type PackSlotDb =
  | "cover_art"
  | "radio_edit"
  | "dirty_full"
  | "instrumental"
  | "acapella"
  | "intro_edit"
  | "short_edit";

export type Artist = {
  id: string;
  profile_id: string;
  display_name: string;
  bio: string | null;
  status: LifecycleStatus;
  created_at: string;
  updated_at: string;
};

export type DjVettingStatus = "pending" | "approved" | "rejected" | "suspended";

export type DjTier = "verified" | "club_dj" | "radio_dj" | "influencer_dj" | "curator";

export type Dj = {
  id: string;
  profile_id: string;
  display_name: string;
  bio: string | null;
  status: LifecycleStatus;
  allow_artist_contact: boolean;
  vetting_status: DjVettingStatus;
  dj_tier: DjTier | null;
  city?: string | null;
  state?: string | null;
  created_at: string;
  updated_at: string;
};

export type DjApplication = {
  id: string;
  dj_id: string;
  dj_name: string;
  city: string;
  state: string;
  email: string;
  phone: string;
  instagram: string | null;
  mixcloud_soundcloud_url: string | null;
  club_radio_affiliation: string | null;
  crew_organization_name: string | null;
  years_djing: number;
  primary_genres: string;
  avg_crowd_size: string;
  plays_clubs: boolean;
  plays_radio: boolean;
  breaks_new_records: boolean;
  created_at: string;
  updated_at: string;
};

export type DjOrganization = {
  id: string;
  name_key: string;
  display_name: string;
  moderation_status: ApprovalStatus;
  formed_at: string | null;
  reviewed_at: string | null;
  reviewed_by: string | null;
  created_at: string;
  updated_at: string;
};

export type Track = {
  id: string;
  artist_id: string;
  title: string;
  description: string | null;
  moderation_status: ApprovalStatus;
  created_at: string;
  updated_at: string;
  credit_artist_name: string;
  featured_artist: string | null;
  producer: string | null;
  genre: string;
  bpm: number | null;
  musical_key: string | null;
  explicit_rating: ExplicitRating;
  release_date: string | null;
  campaign_notes: string | null;
  is_draft: boolean;
  rejection_reason: string | null;
  catalog_active: boolean;
  admin_tags: string[];
};

export type DjPack = {
  id: string;
  dj_id: string;
  name: string;
  description: string | null;
  status: LifecycleStatus;
  created_at: string;
  updated_at: string;
};

export type TrackFile = {
  id: string;
  track_id: string;
  kind: TrackFileKind;
  pack_slot: PackSlotDb | null;
  storage_path: string;
  mime_type: string | null;
  byte_size: number | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export type PackageManifestEntry = {
  track_file_id: string;
  pack_slot: string | null;
  storage_path: string;
};

export type Download = {
  id: string;
  track_id: string;
  dj_id: string;
  status: LifecycleStatus;
  package_manifest: PackageManifestEntry[];
  created_at: string;
  updated_at: string;
};

export type Rating = {
  id: string;
  track_id: string;
  dj_id: string;
  score: number;
  club_ready: boolean | null;
  radio_ready: boolean | null;
  rating_comment: string | null;
  crowd_reaction: CrowdReaction | null;
  created_at: string;
  updated_at: string;
};

export type Feedback = {
  id: string;
  track_id: string;
  dj_id: string;
  body: string;
  moderation_status: ApprovalStatus;
  created_at: string;
  updated_at: string;
};

export type FeaturedActivationSource = "paid_checkout" | "admin_comp";

export type FeaturedPlacement = {
  id: string;
  track_id: string;
  label: string | null;
  starts_at: string | null;
  ends_at: string | null;
  moderation_status: ApprovalStatus;
  payment_id: string | null;
  activation_source: FeaturedActivationSource;
  created_at: string;
  updated_at: string;
};

export type PricingPlan = {
  id: string;
  slug: string;
  label: string;
  duration_days: number;
  price_cents: number;
  currency: string;
  stripe_price_id: string | null;
  active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export type PaymentStatus = "pending" | "processing" | "succeeded" | "failed" | "canceled" | "refunded";

export type Payment = {
  id: string;
  artist_id: string;
  track_id: string;
  pricing_plan_id: string;
  stripe_checkout_session_id: string | null;
  stripe_payment_intent_id: string | null;
  amount_cents: number;
  currency: string;
  status: PaymentStatus;
  created_at: string;
  updated_at: string;
};

export type PlayReportVerification = "self_reported" | "verified";

export type PlayReport = {
  id: string;
  track_id: string;
  dj_id: string;
  period_start: string;
  period_end: string;
  play_count: number;
  status: LifecycleStatus;
  venue_name: string;
  city: string | null;
  state: string | null;
  event_name: string;
  played_at: string;
  estimated_crowd_size: string;
  crowd_reaction: CrowdReaction | null;
  notes: string;
  proof_url: string | null;
  verification_status: PlayReportVerification;
  created_at: string;
  updated_at: string;
};

export type AdminReview = {
  id: string;
  track_id: string;
  reviewer_id: string;
  decision: ApprovalStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type Notification = {
  id: string;
  user_id: string;
  kind: string;
  title: string;
  body: string | null;
  metadata: Record<string, unknown>;
  read_at: string | null;
  created_at: string;
};
