import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

/** Last path segment only — helps ops correlate logs without exposing full user prefixes. */
function pathTailForLog(storagePath: string): string {
  const parts = storagePath.split("/").filter(Boolean);
  return parts.length ? parts[parts.length - 1]! : "(empty)";
}

/** Map storage_path -> short-lived signed URL for catalog images (`supabase` may be service role on logged-out pages). */
export async function signCoverPaths(
  supabase: SupabaseClient,
  paths: (string | null | undefined)[],
): Promise<Map<string, string>> {
  const unique = [...new Set(paths.filter((p): p is string => typeof p === "string" && p.length > 0))];
  const map = new Map<string, string>();
  await Promise.all(
    unique.map(async (path) => {
      try {
        const { data, error } = await supabase.storage.from("promos").createSignedUrl(path, 3600);
        if (!error && data?.signedUrl) {
          map.set(path, data.signedUrl);
          return;
        }
        console.warn("[cover-sign] createSignedUrl rejected", {
          bucket: "promos",
          pathTail: pathTailForLog(path),
          message: error?.message ?? "no_signed_url",
        });
      } catch (e) {
        console.warn("[cover-sign] createSignedUrl threw", {
          bucket: "promos",
          pathTail: pathTailForLog(path),
          err: e instanceof Error ? e.message : String(e),
        });
      }
    }),
  );
  return map;
}
