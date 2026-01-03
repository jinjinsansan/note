import { redirect } from "next/navigation";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import { ArticleWorkspace } from "@/components/articles/article-workspace";
import { getMonthlyArticleUsage, getPlanDefinition } from "@/lib/billing/plans";
import type { StyleProfileSummary } from "@/types/style-profile";
import type { CtaSummary } from "@/types/cta";

type SortOption = "created_desc" | "created_asc" | "title_asc" | "title_desc";
const allowedStatuses = ["draft", "ready", "approved", "published"] as const;
const allowedSorts: SortOption[] = ["created_desc", "created_asc", "title_asc", "title_desc"];

export default async function ArticlesPage({
  searchParams,
}: {
  searchParams?: Record<string, string | undefined>;
}) {
  const supabase = createServerSupabaseClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    redirect("/login");
  }

  const rawStatus = searchParams?.status;
  const statusFilter = allowedStatuses.includes(rawStatus as (typeof allowedStatuses)[number])
    ? (rawStatus as (typeof allowedStatuses)[number])
    : undefined;
  const search = searchParams?.search?.trim() ?? "";
  const rawSort = (searchParams?.sort as SortOption | undefined) ?? "created_desc";
  const sort: SortOption = allowedSorts.includes(rawSort) ? rawSort : "created_desc";

  let query = supabase
    .from("articles")
    .select(
      "id,title,category,status,word_count,meta_description,created_at,updated_at",
    )
    .eq("user_id", session.user.id);

  if (statusFilter) {
    query = query.eq("status", statusFilter);
  }

  if (search) {
    query = query.ilike("title", `%${search}%`);
  }

  if (sort === "created_asc") {
    query = query.order("created_at", { ascending: true });
  } else if (sort === "title_asc") {
    query = query.order("title", { ascending: true });
  } else if (sort === "title_desc") {
    query = query.order("title", { ascending: false });
  } else {
    query = query.order("created_at", { ascending: false });
  }

  const [{ data }, { data: styleProfilesData }, { data: ctasData }, { data: userProfile }] =
    await Promise.all([
    query,
    supabase
      .from("style_profiles")
      .select("id,profile_name,tone,text_style,vocabulary_level,learning_articles,created_at")
      .eq("user_id", session.user.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("cta_settings")
      .select("id,cta_name,cta_content,cta_link,created_at")
      .eq("user_id", session.user.id)
      .order("created_at", { ascending: false }),
      supabase
        .from("users")
        .select("subscription_plan")
        .eq("id", session.user.id)
        .single(),
  ]);

  const styleProfiles = (styleProfilesData ?? []) as StyleProfileSummary[];
  const ctas = (ctasData ?? []) as CtaSummary[];
  const profile = userProfile as { subscription_plan: string | null } | null;
  const plan = getPlanDefinition(profile?.subscription_plan);
  const usageCount = await getMonthlyArticleUsage(supabase, session.user.id);
  const planInfo = {
    planId: plan.id,
    planLabel: plan.label,
    articleQuota: plan.monthlyArticleQuota,
    usage: usageCount,
  };

  return (
    <section className="space-y-8">
      <div className="space-y-2">
        <p className="text-sm font-medium uppercase tracking-widest text-zinc-500">
          AI Drafting
        </p>
        <h1 className="text-3xl font-semibold text-zinc-900">記事生成ワークスペース</h1>
        <p className="text-zinc-600">
          note向け記事の下書きをAIで素早く作成し、Supabaseに安全に保存します。
        </p>
      </div>
      <form className="grid gap-4 rounded-2xl border border-zinc-100 bg-white p-4 sm:grid-cols-3">
        <label className="text-sm text-zinc-500">
          ステータス
          <select
            name="status"
            defaultValue={statusFilter ?? ""}
            className="mt-1 h-10 w-full rounded-md border border-zinc-200 bg-white px-2 text-sm"
          >
            <option value="">すべて</option>
            <option value="draft">下書き</option>
            <option value="ready">承認待ち</option>
            <option value="approved">承認済み</option>
            <option value="published">公開済み</option>
          </select>
        </label>
        <label className="text-sm text-zinc-500">
          キーワード検索
          <input
            type="text"
            name="search"
            defaultValue={search}
            placeholder="タイトルやカテゴリを検索"
            className="mt-1 h-10 w-full rounded-md border border-zinc-200 bg-white px-2 text-sm"
          />
        </label>
        <label className="text-sm text-zinc-500">
          並び替え
          <select
            name="sort"
            defaultValue={sort}
            className="mt-1 h-10 w-full rounded-md border border-zinc-200 bg-white px-2 text-sm"
          >
            <option value="created_desc">作成日 (新しい順)</option>
            <option value="created_asc">作成日 (古い順)</option>
            <option value="title_asc">タイトル (A→Z)</option>
            <option value="title_desc">タイトル (Z→A)</option>
          </select>
        </label>
        <button
          type="submit"
          className="sm:col-span-3 inline-flex h-10 items-center justify-center rounded-md bg-zinc-900 text-sm font-medium text-white"
        >
          適用
        </button>
      </form>
      <ArticleWorkspace
        initialArticles={data ?? []}
        filters={{
          status: statusFilter,
          search,
          sort,
        }}
        styleProfiles={styleProfiles}
        ctas={ctas}
        planInfo={planInfo}
      />
    </section>
  );
}
