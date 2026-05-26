import type { CapacitorConfig } from "@capacitor/cli";

/** Canonical production host for the native shell and Stripe redirects. */
export const PRODUCTION_SITE_URL = "https://digitalservicepack.com";

function resolveServerUrl(): string {
  const fromEnv = process.env.CAPACITOR_SERVER_URL?.trim();
  if (fromEnv) {
    return fromEnv.replace(/\/$/, "");
  }
  return PRODUCTION_SITE_URL;
}

const serverUrl = resolveServerUrl();
const isHttps = serverUrl.startsWith("https://");
const devHttpOverride = process.env.CAPACITOR_DEV === "1" && serverUrl.startsWith("http://");

if (!isHttps && !devHttpOverride) {
  throw new Error(
    `Capacitor server URL must be HTTPS for App Store builds (got ${serverUrl}). ` +
      "Use default production URL, or set CAPACITOR_DEV=1 only for local http:// debugging.",
  );
}

const ALLOWED_EXTERNAL_HOSTS = [
  "digitalservicepack.com",
  "direct2dj.vercel.app",
  "direct2dja.com",
  "checkout.stripe.com",
  "billing.stripe.com",
  "js.stripe.com",
  "hooks.stripe.com",
];

const config: CapacitorConfig = {
  appId: "com.digitalservicepack.app",
  appName: "Digital Service Pack",
  webDir: "capacitor-web",
  server: {
    url: serverUrl,
    /** App Store: always false. Local http:// only when CAPACITOR_DEV=1. */
    cleartext: devHttpOverride,
    androidScheme: "https",
    allowNavigation: ALLOWED_EXTERNAL_HOSTS,
  },
  ios: {
    contentInset: "automatic",
    allowsLinkPreview: false,
    scrollEnabled: true,
    backgroundColor: "#000000",
  },
};

export default config;
