"use server";

import { revalidatePath } from "next/cache";
import { adminActivateCheckoutSession } from "@/lib/admin/payment-reconciliation";
import { getAdminContext } from "@/lib/admin/context";

export async function adminActivatePaymentCheckout(sessionId: string) {
  const ctx = await getAdminContext();
  if ("error" in ctx) return { error: ctx.error };

  const result = await adminActivateCheckoutSession(sessionId);
  if (!result.ok) return { error: result.error };

  revalidatePath("/admin/payments");
  revalidatePath("/admin/submissions");
  revalidatePath("/admin/system");
  revalidatePath("/artist/billing");
  revalidatePath("/artist/dashboard");

  return {
    ok: true as const,
    trackId: result.trackId,
    skipped: result.skipped,
  };
}
