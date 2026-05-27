import { Suspense } from "react";
import { LoginAuthLayout } from "@/components/auth/login-auth-layout";
import { ResetPasswordForm } from "./reset-password-form";

export const dynamic = "force-dynamic";

export default function ResetPasswordPage() {
  return (
    <LoginAuthLayout subtitle="Choose a new password for your account.">
      <Suspense fallback={<p className="text-center text-sm text-zinc-400">Loading…</p>}>
        <ResetPasswordForm />
      </Suspense>
    </LoginAuthLayout>
  );
}
