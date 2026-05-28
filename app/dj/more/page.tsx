import Link from "next/link";
import { SignOutButton } from "@/components/shell/sign-out-button";
import { resolveDjWorkspaceAccess } from "@/lib/auth/resolve-dj-workspace-access";

export default async function DjMorePage() {
  const access = await resolveDjWorkspaceAccess();
  const isApproved = access.state === "DJ_APPROVED";

  const links: { href: string; label: string }[] = [];

  if (
    !isApproved &&
    access.dj?.vetting_status !== "suspended" &&
    (access.state === "DJ_APPLICATION_NOT_STARTED" ||
      access.state === "DJ_APPLICATION_PENDING" ||
      access.state === "DJ_APPLICATION_REJECTED")
  ) {
    links.push({ href: "/dj/apply", label: "DJ application" });
  }

  links.push({ href: "/dj/profile", label: "Profile" });

  if (isApproved) {
    links.push(
      { href: "/dj/play-reports", label: "Play reports" },
      { href: "/dj/history", label: "History" },
    );
  }

  links.push({ href: "/dj/settings", label: "Privacy & settings" });

  return (
    <div className="mx-auto flex w-full max-w-lg flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">More</h1>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          Secondary DJ workspace links and account actions.
        </p>
      </div>
      <nav className="flex flex-col gap-1">
        {links.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="flex min-h-11 items-center rounded-lg border border-zinc-200/80 bg-white/90 px-4 text-sm font-medium dark:border-white/10 dark:bg-black/40"
          >
            {item.label}
          </Link>
        ))}
      </nav>
      <div className="shell-mobile border-t border-white/10 pt-4">
        <SignOutButton className="dj-btn-ghost min-h-11 w-full rounded-lg border px-4 text-sm font-medium" />
      </div>
    </div>
  );
}
