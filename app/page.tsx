import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { dashboardPathForRole } from "@/lib/auth/paths";
import { isUserRole } from "@/lib/types/roles";

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
    <div className="flex flex-1 flex-col items-center px-4 py-10 sm:py-16">
      <div className="w-full max-w-lg space-y-8 text-center sm:text-left">
        <p className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
          Independent promo pool
        </p>
        <h1 className="text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
          Direct 2 DJ
        </h1>
        <p className="text-pretty text-base leading-relaxed text-zinc-600 dark:text-zinc-400">
          A mobile-first foundation for artists to send promos and DJs to discover them — backed by
          Supabase Auth, Postgres with row level security, private storage, and Stripe-ready webhooks.
        </p>

        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
          {openApp ? (
            <Link
              href={openApp.href}
              className="inline-flex min-h-11 items-center justify-center rounded-md bg-zinc-900 px-5 text-sm font-medium text-white transition hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
            >
              {openApp.label}
            </Link>
          ) : null}
          <Link
            href="/login"
            className={`inline-flex min-h-11 items-center justify-center rounded-md border border-zinc-300 px-5 text-sm font-medium text-zinc-900 transition hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-100 dark:hover:bg-zinc-900 ${
              openApp ? "" : "sm:min-w-[10rem]"
            }`}
          >
            {user ? "Switch account" : "Sign in"}
          </Link>
          {user ? (
            <form action="/auth/sign-out" method="post" className="sm:ml-0">
              <button
                type="submit"
                className="min-h-11 w-full rounded-md px-3 text-sm font-medium text-zinc-600 underline-offset-4 hover:underline dark:text-zinc-400 sm:w-auto"
              >
                Sign out
              </button>
            </form>
          ) : null}
        </div>
      </div>
    </div>
  );
}
