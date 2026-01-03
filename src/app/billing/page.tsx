import { redirect } from "next/navigation";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import { BillingActions } from "@/components/billing/billing-actions";
import { getMonthlyArticleUsage, getPlanDefinition } from "@/lib/billing/plans";
import type { Database } from "@/types/supabase";

const FEATURES = [
  "note記事の自動生成とセーブ",
  "CTAテンプレート管理",
  "SEOリサーチツール",
  "承認フロー付き記事エディタ",
];

const PRO_FEATURES = [
  "note自動投稿のスケジューリング",
  "カスタムCTAと一括投稿",
  "優先サポート (24h以内)",
  "スタイル学習クレジット 100/月",
];

export default async function BillingPage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    redirect("/login");
  }

  const [{ data: profile }, { data: subscriptionHistory }] = await Promise.all([
    supabase
      .from("users")
      .select(
        "subscription_plan,subscription_status,stripe_customer_id,api_quota_used,api_quota_monthly",
      )
      .eq("id", session.user.id)
      .single(),
    supabase
      .from("subscriptions")
      .select(
        "plan_id,status,cancel_at_period_end,current_period_start,current_period_end,created_at",
      )
      .eq("user_id", session.user.id)
      .order("created_at", { ascending: false })
      .limit(5),
  ]);

  const profileRow = profile as {
    subscription_plan: string | null;
    subscription_status: string | null;
  } | null;
  const planId = profileRow?.subscription_plan ?? "free";
  const status = profileRow?.subscription_status ?? "inactive";
  const planDefinition = getPlanDefinition(planId);
  const usageThisMonth = await getMonthlyArticleUsage(supabase, session.user.id);

  const subscriptions = (subscriptionHistory ?? []) as Database["public"]["Tables"]["subscriptions"]["Row"][];

  return (
    <section className="space-y-8">
      <div className="space-y-2">
        <p className="text-sm font-medium uppercase tracking-widest text-zinc-500">Billing</p>
        <h1 className="text-3xl font-semibold text-zinc-900">料金プラン</h1>
        <p className="text-zinc-600">
          note記事の自動化レベルに応じてプランを選択できます。Proプランでは投稿自動化やスケジューリングが解放されます。
        </p>
      </div>
      <div className="rounded-2xl border border-zinc-100 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-widest text-zinc-500">現在のプラン</p>
            <p className="text-2xl font-semibold text-zinc-900">{planDefinition.label}</p>
            <p className="text-sm text-zinc-500">
              {planDefinition.monthlyArticleQuota === null
                ? "記事生成の月次上限はありません"
                : `月 ${planDefinition.monthlyArticleQuota} 記事まで。今月 ${usageThisMonth}/${planDefinition.monthlyArticleQuota}`}
            </p>
          </div>
          <div className="w-full sm:w-64">
            {planDefinition.monthlyArticleQuota !== null && (
              <div>
                <div className="h-2 rounded-full bg-zinc-100">
                  <div
                    className="h-2 rounded-full bg-zinc-900"
                    style={{
                      width: `${Math.min(
                        100,
                        Math.round((usageThisMonth / planDefinition.monthlyArticleQuota) * 100),
                      )}%`,
                    }}
                  />
                </div>
                <p className="mt-1 text-xs text-zinc-500">
                  {Math.min(
                    100,
                    Math.round((usageThisMonth / planDefinition.monthlyArticleQuota) * 100),
                  )}
                  % 使用済み
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
      <div className="grid gap-6 md:grid-cols-2">
        <div className="space-y-4 rounded-2xl border border-zinc-200 bg-white p-6">
          <div>
            <p className="text-sm font-semibold uppercase tracking-widest text-zinc-500">
              Free
            </p>
            <p className="text-3xl font-bold text-zinc-900">¥0</p>
            <p className="text-sm text-zinc-500">基本機能を試したい個人ユーザー向け</p>
          </div>
          <ul className="space-y-2 text-sm text-zinc-700">
            {FEATURES.map((feature) => (
              <li key={feature} className="flex items-start gap-2">
                <span>•</span>
                <span>{feature}</span>
              </li>
            ))}
          </ul>
          <div className="pt-4">
            <BillingActions plan={planId === "free" ? "free" : planId} status={status} />
          </div>
        </div>
        <div className="space-y-4 rounded-2xl border border-zinc-900 bg-zinc-50 p-6 shadow-lg">
          <div>
            <p className="text-sm font-semibold uppercase tracking-widest text-zinc-500">
              Pro
            </p>
            <p className="text-3xl font-bold text-zinc-900">¥9,800<span className="text-base">/月</span></p>
            <p className="text-sm text-zinc-500">note投稿の自動化・スケールを狙うチーム向け</p>
          </div>
          <ul className="space-y-2 text-sm text-zinc-700">
            {[...FEATURES, ...PRO_FEATURES].map((feature) => (
              <li key={feature} className="flex items-start gap-2">
                <span>•</span>
                <span>{feature}</span>
              </li>
            ))}
          </ul>
          <div className="pt-4">
            <BillingActions plan={planId} status={status} />
          </div>
        </div>
      </div>
      <div className="space-y-3 rounded-2xl border border-zinc-100 bg-white p-6">
        <div>
          <p className="text-xs uppercase tracking-widest text-zinc-500">最近の請求履歴</p>
          <p className="text-sm text-zinc-500">Stripeサブスクリプションのステータスを表示します</p>
        </div>
        {subscriptions.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="text-xs uppercase tracking-widest text-zinc-500">
                  <th className="py-2">プラン</th>
                  <th className="py-2">ステータス</th>
                  <th className="py-2">期間</th>
                  <th className="py-2">キャンセル予定</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {subscriptions.map((sub) => (
                  <tr key={`${sub.plan_id}-${sub.created_at}`} className="text-zinc-700">
                    <td className="py-3 font-medium">{getPlanDefinition(sub.plan_id).label}</td>
                    <td className="py-3 capitalize">{sub.status ?? "不明"}</td>
                    <td className="py-3 text-xs text-zinc-500">
                      {sub.current_period_start
                        ? `${new Date(sub.current_period_start).toLocaleDateString()} - ${new Date(
                            sub.current_period_end ?? sub.current_period_start,
                          ).toLocaleDateString()}`
                        : "-"}
                    </td>
                    <td className="py-3 text-xs">
                      {sub.cancel_at_period_end ? "次回で終了" : "継続中"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-zinc-500">まだ請求履歴はありません。</p>
        )}
      </div>
    </section>
  );
}
