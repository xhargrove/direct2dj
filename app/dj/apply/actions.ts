"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getDjContext } from "@/lib/dj/context";

function clean(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

function yn(name: string, formData: FormData): "error" | boolean {
  const v = clean(formData.get(name));
  if (v === "yes") return true;
  if (v === "no") return false;
  return "error";
}

export async function submitDjApplication(
  _prev: { error?: string } | null,
  formData: FormData,
): Promise<{ error?: string }> {
  const ctx = await getDjContext();
  if ("error" in ctx) return { error: ctx.error };

  const { data: djRow } = await ctx.supabase.from("djs").select("vetting_status").eq("id", ctx.djId).maybeSingle();
  if (!djRow) return { error: "DJ profile not found." };
  if (djRow.vetting_status === "suspended") {
    return { error: "Suspended accounts cannot submit an application." };
  }
  if (djRow.vetting_status === "approved") {
    return { error: "You are already approved." };
  }

  const dj_name = clean(formData.get("dj_name"));
  const city = clean(formData.get("city"));
  const state = clean(formData.get("state"));
  const email = clean(formData.get("email"));
  const phone = clean(formData.get("phone"));
  const instagram = clean(formData.get("instagram"));
  const mixcloud_soundcloud_url = clean(formData.get("mixcloud_soundcloud_url"));
  const club_radio_affiliation = clean(formData.get("club_radio_affiliation"));
  const crew_organization_name = clean(formData.get("crew_organization_name"));
  const primary_genres = clean(formData.get("primary_genres"));
  const avg_crowd_size = clean(formData.get("avg_crowd_size"));

  const yearsRaw = clean(formData.get("years_djing"));
  const years_djing = Math.max(0, parseInt(yearsRaw, 10) || 0);

  const pc = yn("plays_clubs", formData);
  const pr = yn("plays_radio", formData);
  const br = yn("breaks_new_records", formData);
  if (pc === "error" || pr === "error" || br === "error") {
    return { error: "Answer all yes / no questions." };
  }

  if (dj_name.length < 2) return { error: "DJ name is required." };
  if (!city || !state) return { error: "City and state are required." };
  if (!email.includes("@")) return { error: "Valid email is required." };
  if (phone.length < 7) return { error: "Phone number is required." };
  if (!primary_genres || primary_genres.length < 2) return { error: "Primary genres are required." };
  if (!avg_crowd_size) return { error: "Average crowd size is required." };
  if (crew_organization_name.length > 0 && crew_organization_name.length < 2) {
    return { error: "Crew / organization name must be at least 2 characters, or leave it blank." };
  }

  const payload = {
    dj_id: ctx.djId,
    dj_name,
    city,
    state,
    email,
    phone,
    instagram: instagram || null,
    mixcloud_soundcloud_url: mixcloud_soundcloud_url || null,
    club_radio_affiliation: club_radio_affiliation || null,
    crew_organization_name: crew_organization_name || null,
    years_djing,
    primary_genres,
    avg_crowd_size,
    plays_clubs: pc,
    plays_radio: pr,
    breaks_new_records: br,
    updated_at: new Date().toISOString(),
  };

  const { error } = await ctx.supabase.from("dj_applications").upsert(payload, { onConflict: "dj_id" });

  if (error) return { error: error.message };

  const { error: orgErr } = await ctx.supabase.rpc("dj_set_organization_membership", {
    p_display_name: crew_organization_name,
  });
  if (orgErr) return { error: orgErr.message };

  if (djRow.vetting_status === "rejected") {
    await ctx.supabase
      .from("djs")
      .update({ vetting_status: "pending", updated_at: new Date().toISOString() })
      .eq("id", ctx.djId);
  }

  revalidatePath("/dj/application-status");
  revalidatePath("/dj/apply");
  revalidatePath("/admin/dj-applications");
  revalidatePath("/admin/dj-organizations");
  redirect("/dj/application-status?submitted=1");
}
