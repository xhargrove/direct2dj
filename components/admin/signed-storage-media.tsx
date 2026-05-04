"use client";

import { useEffect, useState } from "react";

async function fetchSignedUrl(path: string): Promise<string> {
  const res = await fetch("/api/admin/sign-storage", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ path }),
    credentials: "same-origin",
  });
  const data = (await res.json()) as { signedUrl?: string; error?: string };
  if (!res.ok || !data.signedUrl) {
    throw new Error(data.error ?? "Could not load file");
  }
  return data.signedUrl;
}

export function SignedAudio({ path, label }: { path: string; label?: string }) {
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchSignedUrl(path)
      .then((u) => {
        if (!cancelled) setUrl(u);
      })
      .catch((e: Error) => {
        if (!cancelled) setError(e.message);
      });
    return () => {
      cancelled = true;
    };
  }, [path]);

  if (error) {
    return <p className="text-sm text-red-600 dark:text-red-400">{error}</p>;
  }
  if (!url) {
    return <p className="text-sm text-zinc-500">Loading audio…</p>;
  }

  return (
    <div className="flex flex-col gap-1">
      {label ? <span className="text-xs text-zinc-500">{label}</span> : null}
      <audio controls className="w-full max-w-md" src={url} preload="metadata" />
    </div>
  );
}

export function SignedImage({ path, alt }: { path: string; alt: string }) {
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchSignedUrl(path)
      .then((u) => {
        if (!cancelled) setUrl(u);
      })
      .catch((e: Error) => {
        if (!cancelled) setError(e.message);
      });
    return () => {
      cancelled = true;
    };
  }, [path]);

  if (error) {
    return <p className="text-sm text-red-600 dark:text-red-400">{error}</p>;
  }
  if (!url) {
    return <p className="text-sm text-zinc-500">Loading artwork…</p>;
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element -- signed blob URLs from Supabase
    <img src={url} alt={alt} className="max-h-56 max-w-full rounded-lg border border-zinc-200 object-contain dark:border-zinc-800" />
  );
}
