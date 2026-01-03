import { headers } from "next/headers";
import { NextResponse } from "next/server";

import { getStripeClient } from "@/lib/stripe";
import { logApiUsage } from "@/lib/api-logger";
import type { Database } from "@/types/supabase";
import { createServerSupabaseClient } from "@/lib/supabase/server";

type BillingPortalProfile = Pick<Database["public"]["Tables"]["users"]["Row"], "stripe_customer_id">;

const defaultOrigin = () => process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

export async function POST() {
  const supabase = await createServerSupabaseClient();
  const startedAt = Date.now();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;

  try {
    const { data: profile, error } = await supabase
      .from("users")
      .select("stripe_customer_id")
      .eq("id", userId)
      .single();

    const profileData = profile as BillingPortalProfile | null;

    if (error || !profileData?.stripe_customer_id) {
      return NextResponse.json(
        { error: "有効なStripeカスタマーがありません" },
        { status: 400 },
      );
    }

    const stripe = getStripeClient();
    const headerStore = await headers();
    const origin = headerStore.get("origin") ?? defaultOrigin();

    const portal = await stripe.billingPortal.sessions.create({
      customer: profileData.stripe_customer_id,
      return_url: `${origin}/billing`,
    });

    await logApiUsage({
      supabase,
      userId,
      endpoint: "/api/billing/portal",
      method: "POST",
      statusCode: 200,
      startedAt,
    });

    return NextResponse.json({ url: portal.url });
  } catch (error) {
    await logApiUsage({
      supabase,
      userId,
      endpoint: "/api/billing/portal",
      method: "POST",
      statusCode: 500,
      startedAt,
      errorMessage: error instanceof Error ? error.message : "portal_error",
    });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "請求ポータルの作成に失敗しました" },
      { status: 500 },
    );
  }
}
