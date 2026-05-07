import Link from "next/link";
import { redirect } from "next/navigation";
import { DjProfileEditForm } from "@/components/dj/dj-profile-edit-form";
import { createClient } from "@/lib/supabase/server";

export default async function DjProfileEditPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: dj }, { data: profile }] = await Promise.all([
    supabase.from("djs").select("display_name, bio, city, state").eq("profile_id", user.id).maybeSingle(),
    supabase.from("profiles").select("avatar_url").eq("id", user.id).maybeSingle(),
  ]);

  if (!dj) redirect("/dj/profile");

  return (
    <div className="mx-auto flex w-full max-w-lg flex-col gap-8">
      <div>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          <Link href="/dj/profile" className="font-medium text-zinc-900 underline dark:text-zinc-100">
            ← Profile
          </Link>
        </p>
        <h1 className="mt-3 text-2xl font-semibold tracking-tight">Edit DJ profile</h1>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          Update how you appear in the product. Vetting status and tier are set by admins.
        </p>
      </div>

      <DjProfileEditForm initial={{ ...dj, avatar_url: profile?.avatar_url ?? null }} />
    </div>
  );
}
