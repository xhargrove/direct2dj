import { SpotlightHubContent } from "@/components/spotlight/spotlight-hub-content";
import { loadSpotlightHub } from "@/lib/spotlight/load-spotlight-hub";

export async function SpotlightHub({
  variant = "featured",
  linkMode = "public",
  showSponsoredCta = false,
  limitPerSection,
}: {
  variant?: "home" | "featured" | "dj";
  linkMode?: "public" | "dj";
  showSponsoredCta?: boolean;
  limitPerSection?: number;
}) {
  const limit = limitPerSection ?? (variant === "home" ? 8 : 12);
  const { sections, error } = await loadSpotlightHub({ limitPerSection: limit });

  return (
    <SpotlightHubContent
      sections={sections}
      linkMode={linkMode}
      variant={variant}
      showSponsoredCta={showSponsoredCta}
      error={error}
    />
  );
}
