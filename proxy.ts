import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";
import { getSupabaseAnonKey, getSupabaseUrl } from "@/lib/supabase/env";
import { updateSession } from "@/lib/supabase/middleware";

function copyCookies(from: NextResponse, to: NextResponse) {
  for (const c of from.cookies.getAll()) {
    to.cookies.set(c.name, c.value, c);
  }
}

export async function proxy(request: NextRequest) {
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
  } = await supabase.auth.getUser();
  if (!user) {
    return sessionResponse;
  }

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (profile?.role !== "dj") {
    return sessionResponse;
  }

  const { data: dj } = await supabase.from("djs").select("vetting_status").eq("profile_id", user.id).maybeSingle();
  if (!dj) {
    return sessionResponse;
  }

  if (dj.vetting_status === "approved") {
    return sessionResponse;
  }

  const allowed =
    pathname === "/dj/apply" ||
    pathname === "/dj/application-status" ||
    pathname === "/dj/settings";
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

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
