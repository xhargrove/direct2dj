const YOUTUBE_ID_RE = /^[\w-]{11}$/;

/** Normalize user paste to canonical watch URL, or null when blank / invalid. */
export function normalizeYoutubeUrl(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  let url: URL;
  try {
    url = new URL(trimmed.startsWith("http") ? trimmed : `https://${trimmed}`);
  } catch {
    return null;
  }

  const host = url.hostname.replace(/^www\./, "").toLowerCase();

  if (host === "youtube.com" || host === "m.youtube.com" || host === "music.youtube.com") {
    if (url.pathname === "/watch") {
      const id = url.searchParams.get("v");
      if (id && YOUTUBE_ID_RE.test(id)) {
        return `https://www.youtube.com/watch?v=${id}`;
      }
    }
    const embedMatch = /^\/embed\/([\w-]{11})/.exec(url.pathname);
    if (embedMatch) {
      return `https://www.youtube.com/watch?v=${embedMatch[1]}`;
    }
    const shortsMatch = /^\/shorts\/([\w-]{11})/.exec(url.pathname);
    if (shortsMatch) {
      return `https://www.youtube.com/watch?v=${shortsMatch[1]}`;
    }
  }

  if (host === "youtu.be") {
    const id = url.pathname.slice(1).split("/")[0]?.split("?")[0];
    if (id && YOUTUBE_ID_RE.test(id)) {
      return `https://www.youtube.com/watch?v=${id}`;
    }
  }

  return null;
}

/** Blank allowed; non-blank must parse to a YouTube watch URL. */
export function parseYoutubeUrlField(raw: string): { ok: true; url: string | null } | { ok: false; error: string } {
  const trimmed = raw.trim();
  if (!trimmed) return { ok: true, url: null };
  const normalized = normalizeYoutubeUrl(trimmed);
  if (!normalized) {
    return {
      ok: false,
      error: "Enter a valid YouTube link (youtube.com/watch, youtu.be, or Shorts URL).",
    };
  }
  return { ok: true, url: normalized };
}

export function youtubeVideoId(url: string | null | undefined): string | null {
  if (!url?.trim()) return null;
  try {
    const u = new URL(url);
    const id = u.searchParams.get("v");
    return id && YOUTUBE_ID_RE.test(id) ? id : null;
  } catch {
    return null;
  }
}
