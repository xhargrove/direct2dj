"use client";

import { useState } from "react";

export function PaidAwaitingUploadLink({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);

  return (
    <button
      type="button"
      className="text-xs font-medium text-zinc-900 underline dark:text-zinc-100"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(url);
          setCopied(true);
          window.setTimeout(() => setCopied(false), 2000);
        } catch {
          window.prompt("Copy artist upload link:", url);
        }
      }}
    >
      {copied ? "Copied" : "Copy artist link"}
    </button>
  );
}
