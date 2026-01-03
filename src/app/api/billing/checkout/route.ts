import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";

import { getStripeClient } from "@/lib/stripe";
import { logApiUsage } from "@/lib/api-logger";
import type { Database } from "@/types/supabase";

const defaultOrigin = () => process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

export async function POST() {
  const supabase = createRouteHandlerClient<Database>({ cookies });
  const startedAt = Date.now();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;

  try {
    const priceId = process.env.STRIPE_PRICE_ID_PRO;
    if (!priceId) {
      throw new Error("STRIPE_PRICE_ID_PRO is not configured");
    }

    const { data: profile, error } = await supabase
      .from("users")
      .select("email,stripe_customer_id")
      .eq("id", userId)
      .single();

    if (error || !profile) {
      throw new Error("ユーザープロフィールを取得できません");
    }

    const stripe = getStripeClient();
    let customerId = profile.stripe_customer_id ?? undefined;

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: profile.email ?? undefined,
        metadata: { userId },
      });
      customerId = customer.id;
      await supabase
        .from("users")
        .update({ stripe_customer_id: customerId })
        .eq("id", userId);
    }

    const origin = headers().get("origin") ?? defaultOrigin();

    const sessionCheckout = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${origin}/billing?status=success`,
      cancel_url: `${origin}/billing?status=cancel`,
      metadata: { userId },
      subscription_data: {
        metadata: { userId },
      },
    });

    await logApiUsage({
      supabase,
      userId,
      endpoint: "/api/billing/checkout",
      method: "POST",
      statusCode: 200,
      startedAt,
    });

    return NextResponse.json({ url: sessionCheckout.url });
  } catch (error) {
    await logApiUsage({
      supabase,
      userId,
      endpoint: "/api/billing/checkout",
      method: "POST",
      statusCode: 500,
      startedAt,
      errorMessage: error instanceof Error ? error.message : "checkout_error",
    });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Checkout failed" },
      { status: 500 },
    );
  }
}
