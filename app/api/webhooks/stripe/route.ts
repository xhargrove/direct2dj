import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { revalidatePath } from "next/cache";
import { activateFeaturedFromCheckoutSession, markCheckoutSessionExpired } from "@/lib/billing/activate-featured-checkout";
import { getStripe } from "@/lib/stripe/server";

export const dynamic = "force-dynamic";

function revalidateFeaturedSurfaces() {
  revalidatePath("/dj/feed");
  revalidatePath("/artist/billing");
  revalidatePath("/artist/analytics");
  revalidatePath("/artist/promote");
  revalidatePath("/admin/featured");
  revalidatePath("/admin/dashboard");
}

export async function POST(request: Request) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    return NextResponse.json(
      { error: "STRIPE_WEBHOOK_SECRET is not configured" },
      { status: 500 },
    );
  }

  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json(
      { error: "Missing Stripe-Signature header" },
      { status: 400 },
    );
  }

  const payload = await request.text();

  let stripe: ReturnType<typeof getStripe>;
  try {
    stripe = getStripe();
  } catch {
    return NextResponse.json(
      { error: "Stripe server is not configured" },
      { status: 500 },
    );
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(payload, signature, webhookSecret);
  } catch {
    return NextResponse.json({ error: "Invalid webhook signature" }, { status: 400 });
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      await activateFeaturedFromCheckoutSession(session);
      revalidateFeaturedSurfaces();
      break;
    }
    case "checkout.session.async_payment_succeeded": {
      const session = event.data.object as Stripe.Checkout.Session;
      await activateFeaturedFromCheckoutSession(session, { trustPaymentComplete: true });
      revalidateFeaturedSurfaces();
      break;
    }
    case "checkout.session.expired": {
      const session = event.data.object as Stripe.Checkout.Session;
      await markCheckoutSessionExpired(session);
      break;
    }
    default:
      break;
  }

  return NextResponse.json({ received: true });
}
