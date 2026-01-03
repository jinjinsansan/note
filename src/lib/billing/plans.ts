import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/types/supabase";

const PLAN_DEFINITIONS = {
  free: {
    id: "free",
    label: "Free",
    monthlyArticleQuota: 5,
  },
  pro: {
    id: "pro",
    label: "Pro",
    monthlyArticleQuota: 50,
  },
  enterprise: {
    id: "enterprise",
    label: "Enterprise",
    monthlyArticleQuota: null,
  },
} as const;

export type PlanId = keyof typeof PLAN_DEFINITIONS;

export type PlanDefinition = (typeof PLAN_DEFINITIONS)[PlanId];

export const getPlanDefinition = (planId?: string | null): PlanDefinition => {
  if (planId && planId in PLAN_DEFINITIONS) {
    return PLAN_DEFINITIONS[planId as PlanId];
  }
  return PLAN_DEFINITIONS.free;
};

export const getCurrentMonthRange = () => {
  const now = new Date();
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
  return { start, end };
};

export const getMonthlyArticleUsage = async (
  client: SupabaseClient<Database>,
  userId: string,
) => {
  const { start } = getCurrentMonthRange();
  const { count } = await client
    .from("articles")
    .select("id", { head: true, count: "exact" })
    .eq("user_id", userId)
    .gte("created_at", start.toISOString());

  return count ?? 0;
};

export const formatUsageSummary = (
  plan: PlanDefinition,
  usage: number,
): string => {
  if (plan.monthlyArticleQuota === null) {
    return "今月の上限はありません";
  }
  return `今月 ${usage}/${plan.monthlyArticleQuota} 記事を生成`;
};

export const getUpgradeCtaLabel = (planId: string) => {
  if (planId === "free") return "Proにアップグレード";
  if (planId === "pro") return "Enterpriseプランについて相談";
  return "プランを管理";
};
