import Link from "next/link";
import { SiteLogo } from "@/components/brand/site-logo";
import { MarketingSiteHeader } from "@/components/shell/marketing-site-header";

export function LoginAuthLayout({
  children,
  subtitle = "Sign in and step into your booth.",
}: {
  children: React.ReactNode;
  subtitle?: string;
}) {
  return (
    <div className="flex min-h-full flex-col">
      <MarketingSiteHeader />
      <div className="flex flex-1 flex-col items-center justify-center px-4 py-10">
        <div className="mb-8 flex flex-col items-center gap-2 text-center">
          <SiteLogo width={120} height={150} className="h-24 w-auto object-contain" priority alt="" />
          <p className="dj-brand text-lg font-semibold tracking-tight text-zinc-50">Digital Service Pack</p>
          <p className="max-w-xs text-sm text-zinc-400">{subtitle}</p>
        </div>
        <div className="dj-card w-full max-w-md p-6 sm:p-9">{children}</div>
        <p className="mt-8 text-center text-sm text-zinc-400">
          <Link href="/login" className="dj-nav-link underline underline-offset-4 hover:underline">
            Back to sign in
          </Link>
          {" · "}
          <Link href="/" className="dj-nav-link underline underline-offset-4 hover:underline">
            Home
          </Link>
        </p>
      </div>
    </div>
  );
}
