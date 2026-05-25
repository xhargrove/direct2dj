import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function OnboardingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/onboarding");
  }

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();

  if (profile?.role === "artist") redirect("/artist");
  if (profile?.role === "dj") redirect("/dj/dashboard");
  if (profile?.role === "admin") redirect("/admin");
  if (profile?.role === "co_admin") redirect("/admin/tracks");
  if (profile?.role === "label_rep") redirect("/label/dashboard");

  return (
    <div className="mx-auto flex min-h-[60vh] w-full max-w-xl flex-col justify-center gap-6 px-4 py-12">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Account setup is incomplete</h1>
        <p className="mt-3 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
          You are signed in, but your account profile could not be found. Please sign out and sign up again, or contact
          support if you already completed registration.
        </p>
      </div>
      <div className="flex flex-wrap gap-3 text-sm">
        <Link
          href="/support"
          className="inline-flex min-h-11 items-center justify-center rounded-md bg-zinc-900 px-4 font-medium text-white dark:bg-zinc-100 dark:text-zinc-900"
        >
          Contact support
        </Link>
        <form action="/auth/sign-out" method="post">
          <button
            type="submit"
            className="inline-flex min-h-11 items-center justify-center rounded-md border border-zinc-300 px-4 font-medium dark:border-zinc-700"
          >
            Sign out
          </button>
        </form>
      </div>
    </div>
  );
}
