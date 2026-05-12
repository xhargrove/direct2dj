import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";
import { getSupabaseAnonKey, getSupabaseUrl } from "@/lib/supabase/env";

/** Edge runs must not hang forever if Supabase Auth is slow or unreachable. */
const AUTH_REFRESH_TIMEOUT_MS = 4000;

function isInvalidStoredRefreshError(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const o = err as { code?: string; message?: string };
  const code = typeof o.code === "string" ? o.code : "";
  if (
    code === "refresh_token_not_found" ||
    code === "invalid_refresh_token" ||
    code === "invalid_grant"
  ) {
    return true;
  }
  const msg = typeof o.message === "string" ? o.message.toLowerCase() : "";
  return msg.includes("refresh token") && (msg.includes("invalid") || msg.includes("not found"));
}

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  let url: string;
  let key: string;
  try {
    url = getSupabaseUrl();
    key = getSupabaseAnonKey();
  } catch {
    return supabaseResponse;
  }

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value),
        );
        supabaseResponse = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options),
        );
      },
    },
  });

  type GetUserResult = Awaited<ReturnType<typeof supabase.auth.getUser>>;

  try {
    const userResult: GetUserResult | null = await Promise.race([
      supabase.auth.getUser(),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), AUTH_REFRESH_TIMEOUT_MS)),
    ]);

    if (userResult === null) {
      return supabaseResponse;
    }

    if (userResult.error && isInvalidStoredRefreshError(userResult.error)) {
      try {
        await supabase.auth.signOut();
      } catch {
        /* ignore */
      }
    }
  } catch {
    /* getUser can throw on unexpected auth failures */
  }

  return supabaseResponse;
}
