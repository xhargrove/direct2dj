import type { AccountAccessState } from "@/lib/auth/account-access-state";

export type AccountAccessCopy = {
  title: string;
  message: string;
  href: string;
};

/** User-facing copy for each account access state (DJ workspace gate). */
export const ACCOUNT_ACCESS_COPY: Record<
  Exclude<AccountAccessState, "DJ_APPROVED">,
  AccountAccessCopy
> = {
  SIGNED_OUT: {
    title: "Please sign in to continue",
    message:
      "You need to sign in before accessing Digital Service Pack workspace features.",
    href: "/login",
  },
  NO_PROFILE: {
    title: "Account setup is incomplete",
    message:
      "You are signed in, but your account profile could not be found. Please complete your account setup before continuing.",
    href: "/onboarding",
  },
  ARTIST_ACCOUNT: {
    title: "This account is registered as an artist",
    message:
      "You are signed in with an artist account. DJ workspace access requires a completed and approved DJ application. To use DJ features, please submit a DJ application with the correct account type.",
    href: "/dj/apply",
  },
  DJ_APPLICATION_NOT_STARTED: {
    title: "Your DJ application is not complete yet",
    message:
      "Thanks for signing in to Digital Service Pack. We could not find a completed DJ application connected to this account. To access the DJ workspace, please complete the DJ application and wait for approval.",
    href: "/dj/apply",
  },
  DJ_APPLICATION_PENDING: {
    title: "Your DJ application is under review",
    message:
      "Thanks for applying to Digital Service Pack. Your DJ account is still pending review. We will email you when a decision is made. You can check your status anytime in your DJ workspace.",
    href: "/dj/application-status",
  },
  DJ_APPLICATION_REJECTED: {
    title: "Your DJ application was not approved",
    message:
      "Your DJ application has been reviewed and was not approved at this time. If you believe this was a mistake or want to update your information, please contact support or submit a new application if allowed.",
    href: "/support",
  },
  UNKNOWN_ERROR: {
    title: "Unable to verify workspace access",
    message:
      "We could not confirm your account access right now. Please sign in again or contact support if this continues.",
    href: "/support",
  },
};

export function copyForAccessState(state: AccountAccessState): AccountAccessCopy | null {
  if (state === "DJ_APPROVED") return null;
  return ACCOUNT_ACCESS_COPY[state];
}
