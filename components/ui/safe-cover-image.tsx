"use client";

import { useState } from "react";

type SafeCoverImageProps = {
  src: string | null | undefined;
  alt?: string;
  className?: string;
  placeholderClassName?: string;
};

/** WKWebView logs decode errors for corrupt or mislabeled promo art — hide failures gracefully. */
export function SafeCoverImage({
  src,
  alt = "",
  className,
  placeholderClassName = "flex h-full w-full items-center justify-center text-xs text-zinc-500",
}: SafeCoverImageProps) {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return <div className={placeholderClassName}>♪</div>;
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      className={className}
      decoding="async"
      onError={() => setFailed(true)}
    />
  );
}
