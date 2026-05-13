import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Syne } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
  adjustFontFallback: true,
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
  adjustFontFallback: true,
});

const syne = Syne({
  variable: "--font-syne",
  subsets: ["latin"],
  display: "swap",
  adjustFontFallback: true,
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://direct2dj.vercel.app"),
  title: "Digital Service Pack — Get Your Music Directly To The DJ",
  description:
    "Get your music directly to DJs: discovery, clean packs, downloads, and reporting — without the inbox chaos.",
  icons: {
    icon: "/site-logo.png",
    apple: "/site-logo.png",
  },
  openGraph: {
    title: "Digital Service Pack — Get Your Music Directly To The DJ",
    description:
      "Get your music directly to DJs: discovery, clean packs, downloads, and reporting — without the inbox chaos.",
    images: [
      {
        url: "/site-logo.png",
        width: 1024,
        height: 1024,
        alt: "Digital Service Pack logo",
      },
    ],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Digital Service Pack — Get Your Music Directly To The DJ",
    description:
      "Get your music directly to DJs: discovery, clean packs, downloads, and reporting — without the inbox chaos.",
    images: ["/site-logo.png"],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [{ media: "(prefers-color-scheme: dark)", color: "#000000" }, { color: "#000000" }],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${syne.variable} dark h-full antialiased`}
    >
      <body className="relative min-h-full">
        <div className="dj-atmosphere" aria-hidden>
          <div className="dj-atmosphere__mesh" />
          <div className="dj-atmosphere__orb dj-atmosphere__orb--cyan" />
          <div className="dj-atmosphere__orb dj-atmosphere__orb--magenta" />
          <div className="dj-atmosphere__orb dj-atmosphere__orb--violet" />
          <div className="dj-atmosphere__grid" />
          <div className="dj-atmosphere__noise" />
          <div className="dj-atmosphere__vignette" />
        </div>
        <div className="relative z-[1] flex min-h-full flex-col">{children}</div>
      </body>
    </html>
  );
}
