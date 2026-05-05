/**
 * When enabled, the login form shows a workspace role dropdown and a server action
 * updates `profiles.role` after sign-in (requires `SUPABASE_SERVICE_ROLE_KEY`).
 *
 * The same flag enables Backstage "workspace test" (admin layout): jump into Artist/DJ
 * mid-session with a signed escape cookie; see `lib/auth/admin-workspace-test.ts`.
 *
 * - Enabled automatically in `NODE_ENV === "development"`.
 * - In production, set `ENABLE_LOGIN_ROLE_SELECTOR=true` only on trusted dev/staging hosts.
 */
export function loginRoleSelectorEnabled(): boolean {
  if (process.env.NODE_ENV === "development") return true;
  return process.env.ENABLE_LOGIN_ROLE_SELECTOR === "true";
}
