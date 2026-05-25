type SiteLogoProps = {
  className?: string;
  width?: number;
  height?: number;
  /** When true, hints the browser to fetch the logo early (maps to fetchpriority). */
  priority?: boolean;
  alt?: string;
};

/** Static brand mark — plain img avoids Next image optimizer WebP that WKWebView often fails to decode. */
export function SiteLogo({
  className,
  width = 164,
  height = 205,
  priority = false,
  alt = "Digital Service Pack logo",
}: SiteLogoProps) {
  return (
    // eslint-disable-next-line @next/next/no-img-element -- intentional for iOS WKWebView JPEG compatibility
    <img
      src="/site-logo.jpg"
      alt={alt}
      width={width}
      height={height}
      className={className}
      decoding="async"
      fetchPriority={priority ? "high" : undefined}
    />
  );
}
