import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { dashboardPathForRole } from "@/lib/auth/paths";
import { isUserRole } from "@/lib/types/roles";
import { ClubHeroVisual } from "@/components/marketing/club-hero-visual";

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

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let openApp: { href: string; label: string } | null = null;
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();
    if (profile?.role && isUserRole(profile.role)) {
      openApp = {
        href: dashboardPathForRole(profile.role),
        label: "Open your workspace",
      };
    }
  }

  return (
    <main className="relative flex flex-1 flex-col overflow-x-hidden">
      <div className="relative mx-auto flex w-full max-w-6xl flex-1 flex-col px-4 pb-24 pt-14 sm:pt-20 md:pt-28">
        <div className="grid items-center gap-14 lg:grid-cols-[minmax(0,1fr)_minmax(300px,440px)] lg:gap-12 xl:gap-20">
          <div className="flex flex-col items-center text-center lg:items-start lg:text-left">
            <p className="dj-kicker dj-eyebrow mb-3 justify-center lg:justify-start">
              Independent promo pool
            </p>

            <h1 className="dj-brand dj-glow-text max-w-[14ch] text-balance text-5xl font-bold leading-[1.05] tracking-tight sm:text-6xl lg:text-7xl">
              Digital Service Pack
            </h1>

            <p className="dj-brand mt-5 max-w-xl text-xl font-semibold tracking-tight text-zinc-800 dark:text-zinc-100 sm:text-2xl">
              DJ-ready promos. Delivered clean. Played loud.
            </p>

            <p className="dj-lede mt-4 max-w-xl">
              Digital Service Pack gives artists one professional lane to get music directly to DJs — with curated
              discovery, secure DJ pack downloads, playlist access, feedback, and play reporting built for real campaign
              movement.
            </p>

            <p className="mt-6 text-center lg:text-left">
              <Link
                href="/featured"
                className="dj-nav-link text-sm font-semibold underline-offset-4 hover:underline"
              >
                What&apos;s featured on Discover →
              </Link>
            </p>

            <div className="mt-10 flex w-full max-w-md flex-col gap-3 sm:max-w-none sm:flex-row sm:flex-wrap sm:items-center sm:justify-center lg:justify-start">
              {openApp ? (
                <Link href={openApp.href} className="dj-btn-primary justify-center sm:min-w-[12rem]">
                  {openApp.label}
                </Link>
              ) : null}
              <Link
                href="/login"
                className={`dj-btn-ghost justify-center ${openApp ? "" : "sm:min-w-[11rem]"}`}
              >
                {user ? "Switch account" : "Enter the booth"}
              </Link>
              {user ? (
                <form action="/auth/sign-out" method="post" className="flex justify-center lg:justify-start">
                  <button
                    type="submit"
                    className="dj-nav-link rounded-full px-3 py-2 text-sm font-medium text-zinc-500 underline-offset-4 hover:underline dark:text-zinc-400"
                  >
                    Sign out
                  </button>
                </form>
              ) : null}
            </div>

            <div className="mt-12 flex flex-wrap items-center justify-center gap-3 text-xs font-medium uppercase tracking-wider text-zinc-500 lg:justify-start dark:text-zinc-500">
              <span className="rounded-full border border-zinc-900/10 bg-white/90 px-3 py-1.5 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-white/5 dark:shadow-none">
                Mobile-first deck
              </span>
              <span className="rounded-full border border-zinc-900/10 bg-white/90 px-3 py-1.5 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-white/5 dark:shadow-none">
                Row-level security
              </span>
              <span className="rounded-full border border-zinc-900/10 bg-white/90 px-3 py-1.5 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-white/5 dark:shadow-none">
                Stripe-ready
              </span>
            </div>
          </div>

          <ClubHeroVisual />
        </div>

        <div className="mt-24 grid gap-4 sm:grid-cols-3">
          <div className="dj-feature-tile flex flex-col gap-3 text-left">
            <IconWave />
            <h2 className="text-base font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
              Curated DJ Discovery
            </h2>
            <p className="text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
              Browse new music in a clean feed built for DJs — organized, searchable, and focused on records worth
              playing.
            </p>
          </div>
          <div className="dj-feature-tile flex flex-col gap-3 text-left">
            <IconDeck />
            <h2 className="text-base font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
              Download-Ready DJ Packs
            </h2>
            <p className="text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
              Artists can deliver clean edits, dirty versions, instrumentals, acapellas, artwork, and metadata in one
              professional pack.
            </p>
          </div>
          <div className="dj-feature-tile flex flex-col gap-3 text-left">
            <IconSignal />
            <h2 className="text-base font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
              Built for Real Campaigns
            </h2>
            <p className="text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
              Track downloads, DJ feedback, playlist adds, and play reporting — with secure storage, verified access,
              and billing when you&apos;re ready to scale.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
