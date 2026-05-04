import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

/** Map storage_path -> short-lived signed URL for catalog images. */
export async function signCoverPaths(
  supabase: SupabaseClient,
  paths: (string | null | undefined)[],
): Promise<Map<string, string>> {
  const unique = [...new Set(paths.filter((p): p is string => typeof p === "string" && p.length > 0))];
  const map = new Map<string, string>();
  await Promise.all(
    unique.map(async (path) => {
      const { data, error } = await supabase.storage.from("promos").createSignedUrl(path, 3600);
      if (!error && data?.signedUrl) map.set(path, data.signedUrl);
    }),
  );
  return map;
}
