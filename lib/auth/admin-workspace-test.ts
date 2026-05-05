import "server-only";

import { createHmac, timingSafeEqual } from "crypto";
import { loginRoleSelectorEnabled } from "@/lib/auth/login-role-selector";

/** HttpOnly cookie: proves this session may restore `profiles.role` to admin via service role. */
export const ADMIN_WORKSPACE_ESCAPE_COOKIE = "d2dj_ws_esc";

const ESCAPE_TTL_SEC = 8 * 60 * 60;

/**
 * Same gate as the login "Sign in as" role selector: dev by default, or explicit env on
 * trusted hosts. Never expose the escape cookie logic to public production without this.
 */
export function adminWorkspaceTestEnabled(): boolean {
  return loginRoleSelectorEnabled();
}

/**
 * HMAC secret for the escape cookie. In production, set `ADMIN_WORKSPACE_TEST_SECRET` when
 * using workspace testing; development falls back to a fixed non-secret default.
 */
export function getAdminWorkspaceTestSecret(): string | null {
  const fromEnv = process.env.ADMIN_WORKSPACE_TEST_SECRET?.trim();
  if (fromEnv) return fromEnv;
  if (process.env.NODE_ENV === "development") return "direct2dj-dev-workspace-escape";
  return null;
}

export function workspaceEscapeTtlSec(): number {
  return ESCAPE_TTL_SEC;
}

export function signWorkspaceEscapeToken(userId: string, secret: string): string {
  const exp = Math.floor(Date.now() / 1000) + ESCAPE_TTL_SEC;
  const payload = JSON.stringify({ sub: userId, exp });
  const sig = createHmac("sha256", secret).update(payload).digest("base64url");
  return `${Buffer.from(payload, "utf8").toString("base64url")}.${sig}`;
}

export function verifyWorkspaceEscapeToken(
  token: string,
  secret: string,
): { sub: string; exp: number } | null {
  const dot = token.indexOf(".");
  if (dot <= 0) return null;
  const bodyB64 = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  let payload: string;
  try {
    payload = Buffer.from(bodyB64, "base64url").toString("utf8");
  } catch {
    return null;
  }
  const expected = createHmac("sha256", secret).update(payload).digest("base64url");
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  let data: { sub?: unknown; exp?: unknown };
  try {
    data = JSON.parse(payload) as { sub?: unknown; exp?: unknown };
  } catch {
    return null;
  }
  if (typeof data.sub !== "string" || typeof data.exp !== "number") return null;
  return { sub: data.sub, exp: data.exp };
}
