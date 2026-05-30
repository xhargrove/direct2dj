/** Parse filename from Content-Disposition (attachment) header. */
export function filenameFromContentDisposition(header: string | null): string | null {
  if (!header) return null;

  const utf8 = /filename\*=UTF-8''([^;\n]+)/i.exec(header);
  if (utf8?.[1]) {
    try {
      return decodeURIComponent(utf8[1].trim());
    } catch {
      return utf8[1].trim();
    }
  }

  const quoted = /filename="([^"]+)"/i.exec(header);
  if (quoted?.[1]) return quoted[1];

  const bare = /filename=([^;\n]+)/i.exec(header);
  if (bare?.[1]) return bare[1].trim().replace(/^"|"$/g, "");

  return null;
}
