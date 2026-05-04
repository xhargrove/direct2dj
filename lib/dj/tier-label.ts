import type { DjTier } from "@/lib/types/database";

const LABELS: Record<DjTier, string> = {
  verified: "Verified",
  club_dj: "Club DJ",
  radio_dj: "Radio DJ",
  influencer_dj: "Influencer DJ",
  curator: "Curator",
};

export function djTierLabel(tier: DjTier | null | undefined): string {
  if (!tier) return "—";
  return LABELS[tier] ?? tier;
}
