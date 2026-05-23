import type { Metadata } from "next";
import Link from "next/link";
import { MarketingSiteHeader } from "@/components/shell/marketing-site-header";
import { SpotlightHub } from "@/components/spotlight/spotlight-hub";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Spotlight Hub · Digital Service Pack",
  description:
    "Editorial picks, Featured Spotlight placements, and live leaderboards from the DJ catalog. Sign in to open packs and download.",
};

export default async function PublicFeaturedPage() {
  return (
    <div className="flex min-h-full flex-col">
      <MarketingSiteHeader />
      <main className="relative flex flex-1 flex-col overflow-x-hidden">
        <div
          id="features"
          className="relative mx-auto flex w-full max-w-4xl flex-1 flex-col scroll-mt-24 px-4 pb-24 pt-8 sm:pt-12 md:pt-16"
        >
          <p className="dj-kicker dj-eyebrow mb-3 text-center">Discover</p>
          <h1 className="dj-brand dj-glow-text text-center text-balance text-4xl font-bold leading-tight tracking-tight sm:text-5xl">
            Spotlight hub
          </h1>
          <p className="dj-lede mx-auto mt-5 max-w-lg text-center">
            Record of the Week, DJ Pick, Featured Spotlight slots, and live leaderboards — the same sections at the top of the
            DJ feed.
          </p>

          <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
            <Link href="/login?next=%2Fdj%2Ffeed" className="dj-btn-primary">
              DJ sign in
            </Link>
            <Link href="/" className="dj-btn-ghost">
              Back to home
            </Link>
          </div>

          <section className="mt-14">
            <SpotlightHub variant="featured" linkMode="public" showSponsoredCta />
          </section>
        </div>
      </main>
    </div>
  );
}
