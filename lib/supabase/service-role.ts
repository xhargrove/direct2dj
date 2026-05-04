import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseUrl } from "@/lib/supabase/env";

function serviceRoleKey(): string | null {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  return key && key.length > 0 ? key : null;
}

/** Bypasses RLS — use only in trusted server contexts (e.g. Stripe webhooks). */
export function createServiceRoleClient(): SupabaseClient {
  const key = serviceRoleKey();
  if (!key) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set");
  }
  return createClient(getSupabaseUrl(), key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/** Same as {@link createServiceRoleClient} when the env var is set; otherwise null (e.g. local dev). */
export function createServiceRoleClientOrNull(): SupabaseClient | null {
  const key = serviceRoleKey();
  if (!key) return null;
  return createClient(getSupabaseUrl(), key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
