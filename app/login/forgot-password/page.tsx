import { Suspense } from "react";
import { redirect } from "next/navigation";
import { LoginAuthLayout } from "@/components/auth/login-auth-layout";
import { getRoleDashboardPath } from "@/lib/auth/session";
import { ForgotPasswordForm } from "./forgot-password-form";

export const dynamic = "force-dynamic";

export default async function ForgotPasswordPage() {
  const dashboard = await getRoleDashboardPath();
  if (dashboard) redirect(dashboard);

  return (
    <LoginAuthLayout subtitle="Reset your password to get back into your booth.">
      <Suspense fallback={<p className="text-center text-sm text-zinc-400">Loading…</p>}>
        <ForgotPasswordForm />
      </Suspense>
    </LoginAuthLayout>
  );
}
