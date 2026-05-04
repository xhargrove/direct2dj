/** Maps Supabase Auth errors to actionable copy for the login UI (no secrets). */
export function describeLoginFailure(error: {
  message: string;
  code?: string;
  status?: number;
}): string {
  const raw = error.message ?? "";
  const lower = raw.toLowerCase();
  const code = error.code ?? "";

  if (
    code === "email_not_confirmed" ||
    lower.includes("email not confirmed") ||
    lower.includes("not confirmed")
  ) {
    return `${raw} Open the confirmation link from email, or for local dev disable “Confirm email” under Supabase → Authentication → Providers → Email.`;
  }

  if (
    lower.includes("invalid login") ||
    lower.includes("invalid credentials") ||
    lower.includes("wrong password") ||
    code === "invalid_credentials"
  ) {
    return `${raw} Reset the password in Supabase → Authentication → Users, or use Sign up with a new account.`;
  }

  if (
    lower.includes("network") ||
    lower.includes("failed to fetch") ||
    lower.includes("load failed") ||
    lower.includes("networkerror") ||
    code === "network_error"
  ) {
    const devHint =
      typeof process !== "undefined" && process.env.NODE_ENV === "development"
        ? " In dev, open /api/dev/supabase-auth to verify URL + anon key (same Supabase project)."
        : "";
    return [
      "Could not reach Supabase (network). Check your connection and VPN.",
      "Confirm NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY match Project Settings → API.",
      devHint,
    ]
      .filter(Boolean)
      .join(" ");
  }

  if (error.status === 401 || lower.includes("401")) {
    const devHint =
      typeof process !== "undefined" && process.env.NODE_ENV === "development"
        ? " In dev, open /api/dev/supabase-auth to verify your Supabase URL + key."
        : "";
    return [
      raw || "Unauthorized",
      "If both sign-in and sign-up return 401, the anon/publishable key usually does not match this project (re-copy from Supabase → Project Settings → API, same row as your project URL).",
      "If only sign-in fails, check password and email confirmation (Providers → Email).",
      devHint,
    ]
      .filter(Boolean)
      .join(" ");
  }

  return raw;
}

