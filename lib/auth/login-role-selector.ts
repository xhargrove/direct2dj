/**
 * When enabled, the login form shows a workspace role dropdown and a server action
 * updates `profiles.role` after sign-in (requires `SUPABASE_SERVICE_ROLE_KEY`).
 *
 * The same flag enables Backstage "workspace test" (admin layout): jump into Artist/DJ
 * mid-session with a signed escape cookie; see `lib/auth/admin-workspace-test.ts`.
 *
 * - Enabled automatically in `NODE_ENV === "development"` (`next dev`).
 * - On Vercel, **Preview** deployments (`VERCEL_ENV === "preview"`) enable it so behavior
 *   matches local without per-preview env. Preview uses whatever Supabase keys you set on
 *   Vercel (often the same DB as production—use a staging Supabase project if unsafe).
 * - **Vercel Production** (`VERCEL_ENV === "production"`): off unless you set
 *   `ENABLE_LOGIN_ROLE_SELECTOR` to a truthy value in Project → Environment Variables
 *   (`true`, `1`, or `yes`, case-insensitive), then redeploy (trusted hosts only).
 */
function enableLoginRoleSelectorEnv(): boolean {
  const raw = process.env.ENABLE_LOGIN_ROLE_SELECTOR?.trim().toLowerCase();
  return raw === "true" || raw === "1" || raw === "yes";
}

export function loginRoleSelectorEnabled(): boolean {
  if (process.env.NODE_ENV === "development") return true;
  if (enableLoginRoleSelectorEnv()) return true;
  if (process.env.VERCEL_ENV === "preview") return true;
  return false;
}
