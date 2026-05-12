import Link from "next/link";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { loginRoleSelectorEnabled } from "@/lib/auth/login-role-selector";
import { getRoleDashboardPath } from "@/lib/auth/session";
import { MarketingSiteHeader } from "@/components/shell/marketing-site-header";
import { LoginForm } from "./login-form";

export const dynamic = "force-dynamic";

type Props = {
  searchParams: Promise<{ mode?: string }>;
};

export default async function LoginPage({ searchParams }: Props) {
  const dashboard = await getRoleDashboardPath();
  if (dashboard) redirect(dashboard);

  const sp = await searchParams;
  const initialMode = sp.mode === "signup" ? "signup" : "signin";
  const showLoginRoleSelector = loginRoleSelectorEnabled();

  return (
    <div className="flex min-h-full flex-col">
      <MarketingSiteHeader />
      <div className="flex flex-1 flex-col items-center justify-center px-4 py-10">
        <div className="mb-8 flex flex-col items-center gap-2 text-center">
          <div
            className="dj-brand flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-400 via-violet-500 to-fuchsia-500 text-lg font-bold text-zinc-950 shadow-[0_12px_40px_rgba(34,211,238,0.35)] ring-2 ring-white/25"
            aria-hidden
          >
            D2
          </div>
          <p className="dj-brand text-lg font-semibold tracking-tight text-zinc-50">Digital Service Pack</p>
          <p className="max-w-xs text-sm text-zinc-400">Sign in and step into your booth.</p>
        </div>
        <div className="dj-card w-full max-w-md p-6 sm:p-9">
          <Suspense fallback={<p className="text-center text-sm text-zinc-400">Loading…</p>}>
            <LoginForm showLoginRoleSelector={showLoginRoleSelector} initialMode={initialMode} />
          </Suspense>
        </div>
        <p className="mt-8 text-center text-sm text-zinc-400">
          <Link href="/" className="dj-nav-link underline underline-offset-4 hover:underline">
            Back to home
          </Link>
        </p>
      </div>
    </div>
  );
}
