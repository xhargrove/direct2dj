import { redirect } from "next/navigation";
import { DjApplicationForm } from "@/components/dj/dj-application-form";
import { createClient } from "@/lib/supabase/server";
import type { DjApplication } from "@/lib/types/database";

export default async function DjApplyPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: dj } = await supabase
    .from("djs")
    .select("id, vetting_status")
    .eq("profile_id", user.id)
    .maybeSingle();

  if (!dj) redirect("/login");

  if (dj.vetting_status === "approved") {
    redirect("/dj/application-status");
  }

  if (dj.vetting_status === "suspended") {
    redirect("/dj/application-status");
  }

  const { data: existingRow } = await supabase.from("dj_applications").select("*").eq("dj_id", dj.id).maybeSingle();

  const existing = (existingRow ?? null) as DjApplication | null;

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">DJ application</h1>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          Complete this form to request access to the promo pool. Admins review submissions before downloads and the
          catalog open up.
        </p>
      </div>

      <DjApplicationForm defaultEmail={user.email ?? ""} existing={existing} />
    </div>
  );
}
