import Image from "next/image";
import Link from "next/link";
import { authGetUserOrTimeout } from "@/lib/supabase/auth-bounded";
import { createClient } from "@/lib/supabase/server";
import { maybeSingleTimeoutFallback } from "@/lib/supabase/maybe-single-timeout-fallback";
import { withTimeout } from "@/lib/supabase/with-timeout";
import { dashboardPathForRole } from "@/lib/auth/paths";
import { isUserRole } from "@/lib/types/roles";
import { MarketingSiteHeader } from "@/components/shell/marketing-site-header";

/** `cookies()` via Supabase client — must not be statically prerendered. */
export const dynamic = "force-dynamic";

function IconWave() {
  return (
    <svg className="h-8 w-8 shrink-0 text-cyan-400/90" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M4 12h2l2-6 4 12 3-9 2 6h3"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconDeck() {
  return (
    <svg className="h-8 w-8 shrink-0 text-fuchsia-400/90" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="9" cy="13" r="4.25" stroke="currentColor" strokeWidth="1.75" />
      <circle cx="16.5" cy="13" r="4.25" stroke="currentColor" strokeWidth="1.75" />
      <path d="M12 6v3M12 17v2" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
    </svg>
  );
}

function IconSignal() {
  return (
    <svg className="h-8 w-8 shrink-0 text-violet-400/90" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 20v-4M8 20v-8M16 20V8M4 20V12"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
    </svg>
  );
}

function IconPlay() {
  return (
    <svg className="h-5 w-5 shrink-0" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M8 5v14l11-7L8 5z" />
    </svg>
  );
}

function IconArrow() {
  return (
    <svg className="h-5 w-5 shrink-0" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M5 12h14m0 0-4-4m4 4-4 4"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default async function Home() {
  let openApp: { href: string; label: string } | null = null;
  let user: { id: string } | null = null;

  try {
    const supabase = await createClient();
    const {
      data: { user: u },
    } = await authGetUserOrTimeout(supabase);
    user = u;

    if (user) {
      const profileRow = await withTimeout(
        supabase.from("profiles").select("role").eq("id", user.id).maybeSingle(),
        4000,
        maybeSingleTimeoutFallback<{ role: string }>(),
      );
      const profile = profileRow.data;
      if (profile?.role && isUserRole(profile.role)) {
        openApp = {
          href: dashboardPathForRole(profile.role),
          label: "Open your workspace",
        };
      }
    }
  } catch {
    // Missing NEXT_PUBLIC_SUPABASE_* or other config — still render marketing shell.
  }

  return (
    <div className="flex min-h-full flex-col">
      <MarketingSiteHeader />
      <main className="relative flex flex-1 flex-col overflow-x-hidden">
        <div className="relative mx-auto flex w-full max-w-6xl flex-1 flex-col px-4 pb-24 pt-8 sm:pt-12 md:pt-16">
          <div className="grid items-center gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(280px,420px)] lg:gap-10 xl:gap-16">
            <div className="flex flex-col items-center text-center lg:items-start lg:text-left">
              <p className="dj-kicker-badge mb-5 justify-center lg:justify-start">
                <span aria-hidden className="text-amber-300">
                  ⚡
                </span>
                Independent promo pool
              </p>

              <h1 className="dj-brand max-w-[12ch] text-balance text-5xl font-bold leading-[1.05] tracking-tight sm:text-6xl lg:text-7xl">
                <span className="block text-foreground">Digital</span>
                <span className="dj-text-service-pack block">Service Pack</span>
              </h1>

              <p className="dj-brand mt-5 max-w-xl text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
                DJ-ready promos. Delivered clean. Played loud.
              </p>

              <p className="dj-lede mt-4 max-w-xl">
                Get music to working DJs with direct downloads, clean pack delivery, feedback loops, and play reporting
                — without inbox chaos.
              </p>

              <div className="mt-8 flex w-full max-w-lg flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-center lg:justify-start">
                {openApp ? (
                  <Link href={openApp.href} className="dj-btn-primary inline-flex justify-center sm:min-w-[12rem]">
                    <IconArrow />
                    {openApp.label}
                  </Link>
                ) : (
                  <Link
                    href="/login?mode=signup"
                    className="dj-btn-primary inline-flex justify-center sm:min-w-[12rem]"
                  >
                    <IconArrow />
                    Get started free
                  </Link>
                )}
                <Link
                  href="/featured#features"
                  className="dj-btn-ghost inline-flex justify-center gap-2 sm:min-w-[11rem]"
                >
                  <IconPlay />
                  See how it works
                </Link>
                <Link
                  href="/login"
                  className="dj-nav-link self-center text-sm font-semibold underline-offset-4 hover:underline sm:self-auto"
                >
                  Sign in
                </Link>
              </div>

              <div className="mt-10 flex flex-wrap items-center justify-center gap-2 lg:justify-start">
                <span className="dj-trust-pill">Row-level security</span>
                <span className="dj-trust-pill">Mobile-first</span>
                <span className="dj-trust-pill">Stripe-ready</span>
              </div>

              <p className="mt-6 text-center lg:text-left">
                <Link href="/featured" className="dj-nav-link text-sm font-semibold underline-offset-4 hover:underline">
                  What&apos;s featured on Discover →
                </Link>
              </p>
            </div>

            <div className="dj-hero-image-wrap relative z-[1]">
              <Image
                src="/marketing/hero-mock.png"
                alt="Digital Service Pack badge"
                width={900}
                height={900}
                className="relative z-[1] w-full max-w-md rounded-2xl object-contain shadow-[0_0_60px_rgba(56,189,248,0.25)] ring-1 ring-white/20 lg:max-w-none"
                priority
                sizes="(max-width: 1024px) 90vw, 420px"
              />
            </div>
          </div>

          <div id="features" className="mt-20 scroll-mt-24 grid gap-4 sm:grid-cols-3">
            <div className="dj-feature-tile flex flex-col gap-3 text-left">
              <IconWave />
              <h2 className="text-base font-semibold tracking-tight text-zinc-50">Curated DJ Discovery</h2>
              <p className="text-sm leading-relaxed text-zinc-400">
                Browse new music in a clean feed built for DJs — organized, searchable, and focused on records worth
                playing.
              </p>
              <Link href="/login?next=%2Fdj%2Ffeed" className="mt-auto text-sm font-semibold text-cyan-300/90 hover:underline">
                Explore feed →
              </Link>
            </div>
            <div className="dj-feature-tile flex flex-col gap-3 text-left">
              <IconDeck />
              <h2 className="text-base font-semibold tracking-tight text-zinc-50">Download-Ready DJ Packs</h2>
              <p className="text-sm leading-relaxed text-zinc-400">
                Artists can deliver clean edits, dirty versions, instrumentals, acapellas, artwork, and metadata in one
                professional pack.
              </p>
              <Link href="/login?next=%2Fartist%2Ftracks%2Fnew" className="mt-auto text-sm font-semibold text-violet-300/90 hover:underline">
                Upload a pack →
              </Link>
            </div>
            <div className="dj-feature-tile flex flex-col gap-3 text-left">
              <IconSignal />
              <h2 className="text-base font-semibold tracking-tight text-zinc-50">Built for Real Campaigns</h2>
              <p className="text-sm leading-relaxed text-zinc-400">
                Track downloads, DJ feedback, playlist adds, and play reporting — with secure storage, verified access,
                and billing when you&apos;re ready to scale.
              </p>
              <Link href="/login?next=%2Fartist%2Fanalytics" className="mt-auto text-sm font-semibold text-fuchsia-300/90 hover:underline">
                View reporting →
              </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
