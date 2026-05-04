import { AllowContactForm } from "@/components/dj/allow-contact-form";
import { DjCityForm } from "@/components/dj/dj-city-form";
import { createClient } from "@/lib/supabase/server";

export default async function DjSettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let allow = false;
  let city: string | null = null;
  if (user) {
    const { data: dj } = await supabase
      .from("djs")
      .select("allow_artist_contact, city")
      .eq("profile_id", user.id)
      .maybeSingle();
    allow = dj?.allow_artist_contact ?? false;
    city = dj?.city ?? null;
  }

  return (
    <div className="mx-auto flex w-full max-w-lg flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">DJ settings</h1>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          Control how much identifying information artists see when you rate tracks or leave feedback, and optional
          location for aggregate analytics.
        </p>
      </div>
      <AllowContactForm initial={allow} />
      <DjCityForm initial={city} />
    </div>
  );
}
