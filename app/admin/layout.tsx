import Image from "next/image";
import Link from "next/link";
import { adminWorkspaceTestEnabled, getAdminWorkspaceTestSecret } from "@/lib/auth/admin-workspace-test";
import { requireRoles } from "@/lib/auth/require-role";
import { AdminWorkspaceTestMenu } from "@/components/admin/admin-workspace-test-menu";

const nav = [
  { href: "/admin/dashboard", label: "Dashboard" },
  { href: "/admin/submissions", label: "Submissions" },
  { href: "/admin/tracks", label: "Tracks" },
  { href: "/admin/tracks/new", label: "New DJ pack" },
  { href: "/admin/featured", label: "Featured" },
  { href: "/admin/artists", label: "Artists" },
  { href: "/admin/djs", label: "DJs" },
  { href: "/admin/dj-applications", label: "DJ applications" },
  { href: "/admin/dj-organizations", label: "DJ organizations" },
  { href: "/admin/play-reports", label: "Play reports" },
] as const;

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireRoles(["admin"]);

  const showWorkspaceTest = adminWorkspaceTestEnabled() && Boolean(getAdminWorkspaceTestSecret());

  return (
    <div className="flex min-h-full flex-col">
      <header className="dj-header flex min-h-14 flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <Image
            src="/site-logo.png"
            alt="Digital Service Pack logo"
            width={28}
            height={28}
            className="h-7 w-7 shrink-0 rounded-md"
            priority
          />
          <div className="flex flex-col gap-0.5">
            <span className="dj-brand text-sm font-semibold leading-none tracking-tight">Digital Service Pack</span>
            <span className="text-xs text-zinc-500 dark:text-zinc-400">Backstage</span>
          </div>
        </div>
        <nav className="flex flex-wrap gap-x-3 gap-y-1 text-sm">
          {nav.map((item) => (
            <Link key={item.href} href={item.href} className="dj-nav-link underline-offset-4 hover:underline">
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="flex flex-col items-stretch gap-2 sm:items-end">
          {showWorkspaceTest ? <AdminWorkspaceTestMenu /> : null}
          <form action="/auth/sign-out" method="post">
            <button type="submit" className="dj-nav-link min-h-10 rounded-md px-3 text-sm font-medium hover:underline">
              Sign out
            </button>
          </form>
        </div>
      </header>
      <main className="flex flex-1 flex-col px-4 py-6">{children}</main>
      <footer className="dj-footer px-4 py-4 text-center text-xs text-zinc-500 dark:text-zinc-400">
        <Link href="/" className="dj-nav-link underline underline-offset-4 hover:underline">
          Home
        </Link>
      </footer>
    </div>
  );
}
