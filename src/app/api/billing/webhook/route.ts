import { headers } from "next/headers";
import { NextResponse } from "next/server";
import type Stripe from "stripe";
type StripeSubscriptionWithPeriods = Stripe.Subscription & {
  current_period_start?: number | null;
  current_period_end?: number | null;
};

type InvoiceWithSubscription = Stripe.Invoice & {
  subscription?: string | Stripe.Subscription | null;
};

type UserEmailRow = Pick<Database["public"]["Tables"]["users"]["Row"], "email">;

import { getStripeClient } from "@/lib/stripe";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { getPlanDefinition, type PlanId } from "@/lib/billing/plans";
import { sendPaymentFailureEmail } from "@/lib/email/notifications";
import type { Database } from "@/types/supabase";

export const runtime = "nodejs";

type UserIdRow = Pick<Database["public"]["Tables"]["users"]["Row"], "id">;

const getUserIdFromSubscription = async (
  subscription: Stripe.Subscription,
  supabaseAdmin: ReturnType<typeof getSupabaseAdminClient>,
) => {
  const metadataUserId = subscription.metadata?.userId;
  if (metadataUserId) {
    return metadataUserId;
  }

  const customerId = typeof subscription.customer === "string" ? subscription.customer : null;
  if (!customerId || !supabaseAdmin) {
    return null;
  }
  const { data } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("stripe_customer_id", customerId)
    .single();
  const userRow = data as UserIdRow | null;
  return userRow?.id ?? null;
};

const mapPriceToPlan = (priceId?: string | null): PlanId => {
  if (priceId && priceId === process.env.STRIPE_PRICE_ID_PRO) {
    return "pro";
  }
  return "free";
};

const isoOrNull = (timestamp?: number | null) =>
  timestamp ? new Date(timestamp * 1000).toISOString() : null;

const applyPlanToUser = async (
  userId: string,
  planId: PlanId,
  status: string,
  supabaseAdmin: ReturnType<typeof getSupabaseAdminClient>,
) => {
  const planDefinition = getPlanDefinition(planId);
  const userUpdate: Database["public"]["Tables"]["users"]["Update"] = {
    subscription_plan: planId,
    subscription_status: status,
    api_quota_monthly: planDefinition.monthlyArticleQuota,
    api_quota_used: 0,
  };
  await supabaseAdmin?.from("users").update(userUpdate as never).eq("id", userId);
};

const upsertSubscriptionRecord = async (
  params: {
    userId: string;
    subscriptionId: string;
    planId: PlanId;
    status: string;
    cancelAtPeriodEnd?: boolean | null;
    periodStart?: number | null;
    periodEnd?: number | null;
  },
  supabaseAdmin: ReturnType<typeof getSupabaseAdminClient>,
) => {
  const { userId, subscriptionId, planId, status, cancelAtPeriodEnd, periodStart, periodEnd } =
    params;
  const subscriptionPayload: Database["public"]["Tables"]["subscriptions"]["Insert"] = {
    user_id: userId,
    stripe_subscription_id: subscriptionId,
    plan_id: planId,
    status,
    cancel_at_period_end: cancelAtPeriodEnd ?? false,
    current_period_start: isoOrNull(periodStart),
    current_period_end: isoOrNull(periodEnd),
  };
  await supabaseAdmin
    ?.from("subscriptions")
    .upsert(subscriptionPayload as never, { onConflict: "user_id" });
};

const handleCheckoutCompleted = async (
  session: Stripe.Checkout.Session,
  stripe: Stripe,
  supabaseAdmin: ReturnType<typeof getSupabaseAdminClient>,
) => {
  const subscriptionId = typeof session.subscription === "string" ? session.subscription : null;
  if (!subscriptionId) {
    return;
  }
  const subscription = (await stripe.subscriptions.retrieve(subscriptionId)) as StripeSubscriptionWithPeriods;
  const userId =
    session.metadata?.userId || (await getUserIdFromSubscription(subscription, supabaseAdmin));
  if (!userId) {
    return;
  }
  const priceId = subscription.items.data[0]?.price?.id;
  const planId = mapPriceToPlan(priceId);
  await applyPlanToUser(userId, planId, "active", supabaseAdmin);
  await upsertSubscriptionRecord(
    {
      userId,
      subscriptionId,
      planId,
      status: subscription.status,
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
      periodStart: subscription.current_period_start,
      periodEnd: subscription.current_period_end,
    },
    supabaseAdmin,
  );
};

const handleSubscriptionUpdated = async (
  subscription: StripeSubscriptionWithPeriods,
  supabaseAdmin: ReturnType<typeof getSupabaseAdminClient>,
) => {
  const userId = await getUserIdFromSubscription(subscription, supabaseAdmin);
  if (!userId) {
    return;
  }
  const priceId = subscription.items.data[0]?.price?.id;
  const planId = mapPriceToPlan(priceId);
  await applyPlanToUser(userId, planId, subscription.status, supabaseAdmin);
  await upsertSubscriptionRecord(
    {
      userId,
      subscriptionId: subscription.id,
      planId,
      status: subscription.status,
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
      periodStart: subscription.current_period_start,
      periodEnd: subscription.current_period_end,
    },
    supabaseAdmin,
  );
};

const handleSubscriptionDeleted = async (
  subscription: StripeSubscriptionWithPeriods,
  supabaseAdmin: ReturnType<typeof getSupabaseAdminClient>,
) => {
  const userId = await getUserIdFromSubscription(subscription, supabaseAdmin);
  if (!userId) {
    return;
  }
  await applyPlanToUser(userId, "free", "canceled", supabaseAdmin);
  const cancelUpdate: Database["public"]["Tables"]["subscriptions"]["Update"] = {
    status: "canceled",
  };
  await supabaseAdmin?.from("subscriptions").update(cancelUpdate as never).eq("user_id", userId);
};

const handleInvoiceSucceeded = async (
  invoice: InvoiceWithSubscription,
  stripe: Stripe,
  supabaseAdmin: ReturnType<typeof getSupabaseAdminClient>,
) => {
  const subscriptionId = typeof invoice.subscription === "string" ? invoice.subscription : null;
  if (!subscriptionId) {
    return;
  }
  const subscription = (await stripe.subscriptions.retrieve(subscriptionId)) as StripeSubscriptionWithPeriods;
  const userId = await getUserIdFromSubscription(subscription, supabaseAdmin);
  if (!userId) {
    return;
  }
  const priceId = subscription.items.data[0]?.price?.id;
  const planId = mapPriceToPlan(priceId);
  const planDefinition = getPlanDefinition(planId);
  const invoiceSuccessUpdate: Database["public"]["Tables"]["users"]["Update"] = {
    api_quota_used: 0,
    api_quota_monthly: planDefinition.monthlyArticleQuota,
    subscription_status: invoice.status ?? "active",
  };
  await supabaseAdmin
    ?.from("users")
    .update(invoiceSuccessUpdate as never)
    .eq("id", userId);
  await upsertSubscriptionRecord(
    {
      userId,
      subscriptionId,
      planId,
      status: subscription.status,
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
      periodStart: subscription.current_period_start,
      periodEnd: subscription.current_period_end,
    },
    supabaseAdmin,
  );
};

const handleInvoiceFailed = async (
  invoice: InvoiceWithSubscription,
  stripe: Stripe,
  supabaseAdmin: ReturnType<typeof getSupabaseAdminClient>,
) => {
  const subscriptionId = typeof invoice.subscription === "string" ? invoice.subscription : null;
  if (!subscriptionId) {
    return;
  }
  const subscription = (await stripe.subscriptions.retrieve(subscriptionId)) as StripeSubscriptionWithPeriods;
  const userId = await getUserIdFromSubscription(subscription, supabaseAdmin);
  if (!userId) {
    return;
  }
  const priceId = subscription.items.data[0]?.price?.id;
  const planId = mapPriceToPlan(priceId);
  const planDefinition = getPlanDefinition(planId);

  if (!supabaseAdmin) {
    return;
  }

  const { data: userProfile } = await supabaseAdmin
    .from("users")
    .select("email")
    .eq("id", userId)
    .single();

  const userProfileData = userProfile as UserEmailRow | null;

  const pastDueUpdate: Database["public"]["Tables"]["users"]["Update"] = {
    subscription_status: "past_due",
  };
  await supabaseAdmin
    .from("users")
    .update(pastDueUpdate as never)
    .eq("id", userId);
  await upsertSubscriptionRecord(
    {
      userId,
      subscriptionId,
      planId,
      status: "past_due",
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
      periodStart: subscription.current_period_start,
      periodEnd: subscription.current_period_end,
    },
    supabaseAdmin,
  );

  if (userProfileData?.email) {
    const nextAttempt = invoice.next_payment_attempt
      ? new Date(invoice.next_payment_attempt * 1000).toLocaleString("ja-JP")
      : undefined;
    await sendPaymentFailureEmail({
      email: userProfileData.email,
      planLabel: planDefinition.label,
      nextAction: nextAttempt ? `${nextAttempt} に再請求を試行します` : undefined,
    });
  }
};

export async function POST(request: Request) {
  const stripe = getStripeClient();
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  const supabaseAdmin = getSupabaseAdminClient();

  if (!webhookSecret) {
    return NextResponse.json({ error: "Webhook secret not configured" }, { status: 500 });
  }

  if (!supabaseAdmin) {
    return NextResponse.json({ error: "Supabase admin client unavailable" }, { status: 500 });
  }

  const headerStore = await headers();
  const signature = headerStore.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing Stripe signature" }, { status: 400 });
  }
  const payload = await request.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(payload, signature, webhookSecret);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid signature";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed":
        await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session, stripe, supabaseAdmin);
        break;
      case "customer.subscription.updated":
        await handleSubscriptionUpdated(event.data.object as Stripe.Subscription, supabaseAdmin);
        break;
      case "customer.subscription.deleted":
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription, supabaseAdmin);
        break;
      case "invoice.payment_succeeded":
        await handleInvoiceSucceeded(event.data.object as Stripe.Invoice, stripe, supabaseAdmin);
        break;
      case "invoice.payment_failed":
        await handleInvoiceFailed(event.data.object as Stripe.Invoice, stripe, supabaseAdmin);
        break;
      default:
        break;
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "webhook_error";
    return NextResponse.json({ error: message }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
