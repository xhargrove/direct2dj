import type { PostgrestMaybeSingleResponse } from "@supabase/postgrest-js";

/** Empty success-shaped response when `withTimeout` fires on a `.maybeSingle()` query. */
export function maybeSingleTimeoutFallback<T>(): PostgrestMaybeSingleResponse<T> {
  return {
    success: true,
    error: null,
    data: null,
    count: null,
    status: 200,
    statusText: "OK",
  };
}
