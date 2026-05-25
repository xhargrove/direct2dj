export const OUTREACH_PRESETS = {
  pending_dj: {
    label: "DJ application still pending",
    title: "Your DJ application is under review",
    body: "Thanks for applying to Digital Service Pack. Your DJ account is still pending review. We will email you when a decision is made. You can check status anytime in your DJ workspace.",
    href: "/dj/application-status",
    audience: "pending_djs" as const,
  },
  wrong_role_artist: {
    label: "Signed up as Artist — meant to be DJ",
    title: "Your Digital Service Pack account role",
    body: "It looks like you signed up as an Artist but need a DJ account to browse promos and download packs. We updated your account to DJ — sign in again and complete your DJ application if you have not already.",
    href: "/dj/apply",
    audience: "single_profile" as const,
    fixRole: "dj" as const,
  },
  wrong_role_dj: {
    label: "Signed up as DJ — meant to be Artist",
    title: "Your Digital Service Pack account role",
    body: "It looks like you signed up as a DJ but need an Artist account to upload music. We updated your account to Artist — sign in again to open your artist dashboard.",
    href: "/artist",
    audience: "single_profile" as const,
    fixRole: "artist" as const,
  },
} as const;

export type OutreachPresetKey = keyof typeof OUTREACH_PRESETS;
