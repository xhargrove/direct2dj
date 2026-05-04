import Link from "next/link";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { loginRoleSelectorEnabled } from "@/lib/auth/login-role-selector";
import { getRoleDashboardPath } from "@/lib/auth/session";
import { LoginForm } from "./login-form";

export default async function LoginPage() {
  const dashboard = await getRoleDashboardPath();
  if (dashboard) redirect(dashboard);

  const showLoginRoleSelector = loginRoleSelectorEnabled();

  return (
    <div className="flex min-h-full flex-1 flex-col items-center justify-center px-4 py-10">
      <Suspense
        fallback={
          <p className="text-sm text-zinc-600 dark:text-zinc-400">Loading…</p>
        }
      >
        <LoginForm showLoginRoleSelector={showLoginRoleSelector} />
      </Suspense>
      <p className="mt-8 text-center text-sm text-zinc-600 dark:text-zinc-400">
        <Link href="/" className="underline underline-offset-4">
          Back to home
        </Link>
      </p>
    </div>
  );
}
