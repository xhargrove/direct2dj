import "server-only";
import { createClient } from "@/lib/supabase/server";

export async function getDjContext() {
  const supabase = await createClient();
  const {
    data: { user },
    error: authErr,
  } = await supabase.auth.getUser();
  if (authErr || !user) {
    return { error: "Not signed in." as const };
  }
  const { data: dj, error: djErr } = await supabase
    .from("djs")
    .select("id")
    .eq("profile_id", user.id)
    .maybeSingle();
  if (djErr || !dj) {
    return { error: "No DJ profile found." as const };
  }
  return { supabase, userId: user.id, djId: dj.id };
}
