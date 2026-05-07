import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";
import { getSupabaseAnonKey, getSupabaseUrl } from "@/lib/supabase/env";
import { updateSession } from "@/lib/supabase/middleware";

const AUTH_REFRESH_TIMEOUT_MS = 4000;
/** PostgREST `.maybeSingle()` can hang when the API is unreachable — same failure mode as hung browsers. */
const ROW_QUERY_TIMEOUT_MS = 4000;

function copyCookies(from: NextResponse, to: NextResponse) {
  for (const c of from.cookies.getAll()) {
    to.cookies.set(c.name, c.value, c);
  }
}

async function raceMaybeSingleRow<T extends { data: unknown }>(
  promise: PromiseLike<T>,
  ms: number,
): Promise<T> {
  return Promise.race([
    Promise.resolve(promise),
    new Promise<T>((resolve) =>
      setTimeout(
        () =>
          resolve({
            data: null,
          } as T),
        ms,
      ),
    ),
  ]);
}

async function runProxy(request: NextRequest) {
  const sessionResponse = await updateSession(request);

  const pathname = request.nextUrl.pathname;
  if (!pathname.startsWith("/dj")) {
    return sessionResponse;
  }

  let url: string;
  let key: string;
  try {
    url = getSupabaseUrl();
    key = getSupabaseAnonKey();
  } catch {
    return sessionResponse;
  }

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll() {
        /* Session refresh already applied on sessionResponse */
      },
    },
  });

  const {
    data: { user },
  } = await Promise.race([
    supabase.auth.getUser(),
    new Promise<{ data: { user: null } }>((resolve) =>
      setTimeout(() => resolve({ data: { user: null } }), AUTH_REFRESH_TIMEOUT_MS),
    ),
  ]);
  if (!user) {
    return sessionResponse;
  }

  const { data: profile } = await raceMaybeSingleRow(
    supabase.from("profiles").select("role").eq("id", user.id).maybeSingle(),
    ROW_QUERY_TIMEOUT_MS,
  );
  if (profile?.role !== "dj") {
    return sessionResponse;
  }

  const { data: dj } = await raceMaybeSingleRow(
    supabase.from("djs").select("vetting_status").eq("profile_id", user.id).maybeSingle(),
    ROW_QUERY_TIMEOUT_MS,
  );
  if (!dj) {
    return sessionResponse;
  }

  if (dj.vetting_status === "approved") {
    return sessionResponse;
  }

  const allowed =
    pathname === "/dj/apply" ||
    pathname === "/dj/application-status" ||
    pathname === "/dj/settings" ||
    pathname === "/dj/dashboard" ||
    pathname.startsWith("/dj/profile");
  if (allowed) {
    if (dj.vetting_status === "suspended" && pathname === "/dj/apply") {
      const redirectResponse = NextResponse.redirect(new URL("/dj/application-status", request.url));
      copyCookies(sessionResponse, redirectResponse);
      return redirectResponse;
    }
    return sessionResponse;
  }

  const redirectResponse = NextResponse.redirect(new URL("/dj/application-status", request.url));
  copyCookies(sessionResponse, redirectResponse);
  return redirectResponse;
}

/** @deprecated Prefer named export `middleware` (Next.js 16 proxy convention). */
export const proxy = runProxy;

/** Next.js middleware entry — session refresh + `/dj` vetting gate. */
export const middleware = runProxy;

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
