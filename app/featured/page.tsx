import type { Metadata } from "next";
import Link from "next/link";
import { HowItWorksSections } from "@/components/marketing/how-it-works-sections";
import { MarketingSiteHeader } from "@/components/shell/marketing-site-header";
import { SpotlightHub } from "@/components/spotlight/spotlight-hub";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "How it works · Digital Service Pack",
  description:
    "How artists upload DJ packs and how vetted DJs discover, rate, download, and report plays — plus featured artists and editorial picks from the catalog.",
};

export default async function PublicFeaturedPage() {
  return (
    <div className="flex min-h-full flex-col">
      <MarketingSiteHeader />
      <main className="relative flex flex-1 flex-col overflow-x-hidden">
        <div className="relative mx-auto flex w-full max-w-4xl flex-1 flex-col px-4 pb-24 pt-8 sm:pt-12 md:pt-16">
          <section id="how-it-works" className="scroll-mt-24">
            <p className="dj-kicker dj-eyebrow mb-3 text-center">Platform</p>
            <h1 className="dj-brand dj-glow-text text-center text-balance text-4xl font-bold leading-tight tracking-tight sm:text-5xl">
              How it works
            </h1>
            <p className="dj-lede mx-auto mt-5 max-w-2xl text-center">
              Digital Service Pack connects independent artists with working DJs — clean pack delivery, structured
              feedback, and play reporting in one place.
            </p>

            <div className="mt-10">
              <HowItWorksSections />
            </div>

            <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
              <Link href="/login?mode=signup" className="dj-btn-primary">
                Get started
              </Link>
              <Link href="/login" className="dj-btn-ghost">
                Sign in
              </Link>
            </div>
          </section>

          <section id="featured-artists" className="mt-20 scroll-mt-24 border-t border-white/10 pt-16">
            <p className="dj-kicker dj-eyebrow mb-3 text-center">Spotlight</p>
            <h2 className="text-center text-3xl font-bold tracking-tight sm:text-4xl">Featured artists &amp; records</h2>
            <p className="mx-auto mt-4 max-w-2xl text-center text-sm text-zinc-400 sm:text-base">
              Editorial picks from the Digital Service Pack team — Featured Artist, Record of the Week, DJ Pick, and
              paid Featured Spotlight slots from artists in the catalog. Sign in as a DJ to preview and download packs.
            </p>

            <div className="mx-auto mt-12 w-full max-w-6xl">
              <SpotlightHub variant="featured" linkMode="public" showSponsoredCta />
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
