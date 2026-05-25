import type { CapacitorConfig } from "@capacitor/cli";

/** Production web app — Next.js stays on Vercel; the native shell loads this URL. */
const DEFAULT_SERVER_URL = "https://digitalservicepack.com";

function resolveServerUrl(): string {
  const fromEnv = process.env.CAPACITOR_SERVER_URL?.trim();
  if (fromEnv) {
    return fromEnv.replace(/\/$/, "");
  }
  return DEFAULT_SERVER_URL;
}

const serverUrl = resolveServerUrl();

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
    cleartext: serverUrl.startsWith("http://"),
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
