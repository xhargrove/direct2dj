import { NextResponse } from "next/server";
import { getSupabaseAnonKey, getSupabaseUrl } from "@/lib/supabase/env";

export const dynamic = "force-dynamic";

/** Production: always 404. Dev: wrong HTTP method. */
function devRouteMethodResponse() {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
}

export async function POST() {
  return devRouteMethodResponse();
}

export async function PUT() {
  return devRouteMethodResponse();
}

export async function PATCH() {
  return devRouteMethodResponse();
}

export async function DELETE() {
  return devRouteMethodResponse();
}

/** Decode legacy anon JWT payload (no signature verification) for ref mismatch hints only. */
function jwtPayloadRef(key: string): string | null {
  if (!key.startsWith("eyJ")) return null;
  try {
    const parts = key.split(".");
    if (parts.length < 2) return null;
    const json = JSON.parse(atob(parts[1].replace(/-/g, "+").replace(/_/g, "/"))) as { ref?: string };
    return typeof json.ref === "string" ? json.ref : null;
  } catch {
    return null;
  }
}

function projectRefFromSupabaseUrl(url: string): string | null {
  try {
    const host = new URL(url).hostname;
    const sub = host.split(".")[0];
    return sub && sub.length > 0 ? sub : null;
  } catch {
    return null;
  }
}

async function fetchOk(url: string, headers: HeadersInit): Promise<Response> {
  return fetch(url, { headers, cache: "no-store" });
}

function validatePublicSupabaseUrl(raw: string): string | null {
  try {
    const u = new URL(raw);
    if (u.protocol !== "https:") return "NEXT_PUBLIC_SUPABASE_URL must use https://";
    return null;
  } catch {
    return "NEXT_PUBLIC_SUPABASE_URL is not a valid URL (check for spaces or missing https://).";
  }
}

function serializeNetworkError(e: unknown): {
  message: string;
  cause?: string;
  code?: string;
} {
  if (!(e instanceof Error)) return { message: String(e) };
  const out: { message: string; cause?: string; code?: string } = { message: e.message };
  const err = e as NodeJS.ErrnoException;
  if (typeof err.code === "string") out.code = err.code;
  if ("cause" in e && e.cause !== undefined) {
    if (e.cause instanceof Error) {
      out.cause = e.cause.message;
      const c = e.cause as NodeJS.ErrnoException;
      if (typeof c.code === "string" && !out.code) out.code = c.code;
    } else {
      out.cause = String(e.cause);
    }
  }
  return out;
}

function hintForNetworkError(detail: { message: string; cause?: string; code?: string }): string {
  const c = detail.code ?? "";
  const m = `${detail.message} ${detail.cause ?? ""}`.toLowerCase();
  if (c === "ENOTFOUND" || m.includes("getaddrinfo")) {
    return "DNS could not resolve the host. Check NEXT_PUBLIC_SUPABASE_URL for typos, VPN, or offline network.";
  }
  if (c === "ECONNREFUSED" || m.includes("refused")) {
    return "Connection refused. Check the URL host/port; project must be reachable from your machine.";
  }
  if (c === "ETIMEDOUT" || m.includes("timeout")) {
    return "Request timed out — firewall, VPN, or unstable network.";
  }
  if (m.includes("cert") || m.includes("ssl") || m.includes("tls")) {
    return "TLS/SSL error — rare for supabase.co; check system date, proxy, or corporate SSL inspection.";
  }
  return "The dev server could not reach Supabase over the network. Confirm URL, internet, and that fetch is not blocked (e.g. rare sandboxed environments).";
}

/**
 * Development only: validates URL + anon/publishable key against Auth and PostgREST.
 * Not available in production.
 */
export async function GET() {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  try {
    const url = getSupabaseUrl();
    const urlFormatError = validatePublicSupabaseUrl(url);
    if (urlFormatError) {
      return NextResponse.json(
        {
          ok: false,
          error: urlFormatError,
          hint: "Copy Project URL exactly from Supabase → Project Settings → API.",
        },
        { status: 400 },
      );
    }

    const key = getSupabaseAnonKey();

    const jwtRef = jwtPayloadRef(key);
    const urlRef = projectRefFromSupabaseUrl(url);
    const refMismatch =
      jwtRef && urlRef && jwtRef !== urlRef
        ? `Legacy JWT project ref "${jwtRef}" does not match hostname ref "${urlRef}" — use URL + keys from the same Project Settings → API page.`
        : null;

    /** Publishable keys (`sb_publishable_…`): prefer apikey-only on Auth. Legacy JWT: apikey + Bearer. */
    const authApiKeyOnly = await fetchOk(`${url}/auth/v1/settings`, { apikey: key });
    const authWithBearer =
      authApiKeyOnly.ok
        ? null
        : await fetchOk(`${url}/auth/v1/settings`, {
            apikey: key,
            Authorization: `Bearer ${key}`,
          });

    const authRes = authApiKeyOnly.ok ? authApiKeyOnly : authWithBearer ?? authApiKeyOnly;
    const authProbe = authApiKeyOnly.ok
      ? "auth-settings-apikey-only"
      : authWithBearer?.ok
        ? "auth-settings-apikey-and-bearer"
        : "failed";

    /**
     * PostgREST: `GET /rest/v1/` often returns 401 on hosted Supabase even with a valid key.
     * Hit a real resource with standard headers; 401 = bad key, anything else = gateway accepted the key (incl. RLS 403 / empty 200).
     */
    const restHeadersStandard: HeadersInit = {
      apikey: key,
      Authorization: `Bearer ${key}`,
    };
    const restStandard = await fetchOk(
      `${url}/rest/v1/profiles?select=id&limit=1`,
      restHeadersStandard,
    );
    const restApiKeyOnly =
      restStandard.status === 401
        ? await fetchOk(`${url}/rest/v1/profiles?select=id&limit=1`, { apikey: key })
        : null;
    const restRes = restStandard.status !== 401 ? restStandard : restApiKeyOnly ?? restStandard;
    const restProbe = (() => {
      if (restStandard.status !== 401) {
        if (restStandard.ok) return "rest-profiles-jwt-bearer";
        return `rest-profiles-status-${restStandard.status}`;
      }
      if (restApiKeyOnly && restApiKeyOnly.status !== 401) {
        return restApiKeyOnly.ok ? "rest-profiles-apikey-only" : `rest-profiles-apikey-only-${restApiKeyOnly.status}`;
      }
      return "failed";
    })();
    const restGatewayAccepted = restRes.status !== 401;

    let summary: string;
    if (refMismatch) {
      summary = refMismatch;
    } else if (authRes.ok) {
      summary =
        "Auth API accepted this key. If login still fails, check password and email confirmation (Authentication → Providers → Email).";
    } else if (restGatewayAccepted) {
      summary =
        "PostgREST accepted this key but Auth did not — uncommon; confirm Auth is enabled for this project. For login, prefer legacy anon JWT (eyJ…) from Settings → API.";
    } else {
      summary =
        "Neither Auth nor PostgREST accepted this key. Re-copy Project URL and anon / publishable key from one Supabase project only (Settings → API). One continuous line for the key; restart `npm run dev` after saving `.env.local`.";
    }

    return NextResponse.json({
      ok: authRes.ok,
      authAccepted: authRes.ok,
      restAccepted: restGatewayAccepted,
      auth: {
        httpStatus: authRes.status,
        ok: authRes.ok,
        probe: authProbe,
      },
      rest: {
        httpStatus: restRes.status,
        ok: restGatewayAccepted,
        probe: restProbe,
      },
      hints: {
        urlProjectRef: urlRef,
        jwtProjectRef: jwtRef,
        refMismatch: Boolean(refMismatch),
      },
      summary,
    });
  } catch (e) {
    const detail = serializeNetworkError(e);
    return NextResponse.json(
      {
        ok: false,
        error: detail.message,
        cause: detail.cause,
        code: detail.code,
        hint: hintForNetworkError(detail),
      },
      { status: 500 },
    );
  }
}
