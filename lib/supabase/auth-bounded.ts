import type { SupabaseClient } from "@supabase/supabase-js";

const DEFAULT_MS = 5000;

/**
 * Supabase `auth.getUser()` can hang when the Auth API is unreachable (wrong URL, VPN, firewall).
 * Middleware already caps refresh time; server components must not block the HTML stream forever.
 */
export async function authGetUserOrTimeout(
  supabase: SupabaseClient,
  ms = DEFAULT_MS,
): Promise<Awaited<ReturnType<SupabaseClient["auth"]["getUser"]>>> {
  type R = Awaited<ReturnType<SupabaseClient["auth"]["getUser"]>>;
  const timedOut = {
    data: { user: null },
    error: null,
  } as unknown as R;

  return Promise.race([
    supabase.auth.getUser(),
    new Promise<R>((resolve) => setTimeout(() => resolve(timedOut), ms)),
  ]);
}
