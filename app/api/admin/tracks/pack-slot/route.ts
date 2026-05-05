import { NextResponse } from "next/server";
import { getAdminContext } from "@/lib/admin/context";
import { replaceAdminPackSlot } from "@/lib/admin/replace-admin-pack-slot";

/** Large WAV uploads — align with `serverActions.bodySizeLimit` in next.config */
export const maxDuration = 120;

export async function POST(req: Request) {
  const ctx = await getAdminContext();
  if ("error" in ctx) {
    return NextResponse.json({ error: ctx.error }, { status: 403 });
  }

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: "Could not read upload (form data)." }, { status: 400 });
  }

  const result = await replaceAdminPackSlot(ctx.supabase, formData);
  if ("error" in result && result.error) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json(result);
}
