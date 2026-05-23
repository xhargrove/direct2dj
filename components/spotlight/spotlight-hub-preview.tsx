import { SpotlightHubContent } from "@/components/spotlight/spotlight-hub-content";
import type { SpotlightSection } from "@/lib/spotlight/load-spotlight-hub";

export function SpotlightHubPreview({
  sections,
  linkMode = "public",
}: {
  sections: SpotlightSection[];
  linkMode?: "public" | "dj";
}) {
  return (
    <SpotlightHubContent
      sections={sections}
      linkMode={linkMode}
      variant="featured"
      showSponsoredCta={false}
      showEmptyEditorialSections
    />
  );
}
