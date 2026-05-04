import Link from "next/link";
import { requireRoles } from "@/lib/auth/require-role";

const nav = [
  { href: "/admin/dashboard", label: "Dashboard" },
  { href: "/admin/submissions", label: "Submissions" },
  { href: "/admin/tracks", label: "Tracks" },
  { href: "/admin/featured", label: "Featured" },
  { href: "/admin/artists", label: "Artists" },
  { href: "/admin/djs", label: "DJs" },
  { href: "/admin/dj-applications", label: "DJ applications" },
  { href: "/admin/play-reports", label: "Play reports" },
] as const;

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireRoles(["admin"]);

  return (
    <div className="flex min-h-full flex-col">
      <header className="flex min-h-14 flex-col gap-3 border-b border-zinc-200 px-4 py-3 dark:border-zinc-800 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-0.5">
          <span className="text-sm font-semibold leading-none">Direct 2 DJ</span>
          <span className="text-xs text-zinc-500 dark:text-zinc-400">Admin</span>
        </div>
        <nav className="flex flex-wrap gap-x-3 gap-y-1 text-sm">
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-zinc-700 underline-offset-4 hover:underline dark:text-zinc-300"
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <form action="/auth/sign-out" method="post">
          <button
            type="submit"
            className="min-h-10 rounded-md px-3 text-sm font-medium text-zinc-700 underline-offset-4 hover:underline dark:text-zinc-300"
          >
            Sign out
          </button>
        </form>
      </header>
      <main className="flex flex-1 flex-col px-4 py-6">{children}</main>
      <footer className="border-t border-zinc-200 px-4 py-4 text-center text-xs text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
        <Link href="/" className="underline underline-offset-4">
          Home
        </Link>
      </footer>
    </div>
  );
}
