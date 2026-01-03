"use client";

import { useMemo, useState, type ComponentProps } from "react";
import Link from "next/link";

import { ArticleComposer } from "@/components/articles/article-composer";
import { ArticleList } from "@/components/articles/article-list";
import type { StyleProfileSummary } from "@/types/style-profile";
import type { CtaSummary } from "@/types/cta";

type ArticlePreview = ComponentProps<typeof ArticleList>["articles"];

type Filters = {
  status?: "draft" | "ready" | "approved" | "published";
  search?: string;
  sort: "created_desc" | "created_asc" | "title_asc" | "title_desc";
};

type Props = {
  initialArticles: ArticlePreview;
  filters: Filters;
  styleProfiles: StyleProfileSummary[];
  ctas: CtaSummary[];
  planInfo: {
    planId: string;
    planLabel: string;
    articleQuota: number | null;
    usage: number;
  };
};

const matchesFilters = (article: ArticlePreview[number], filters: Filters) => {
  if (filters.status && article.status !== filters.status) {
    return false;
  }

  const searchTerm = filters.search?.trim().toLowerCase();
  if (searchTerm) {
    const haystack = `${article.title ?? ""} ${article.category ?? ""}`.toLowerCase();
    if (!haystack.includes(searchTerm)) {
      return false;
    }
  }

  return true;
};

const sortArticles = (articles: ArticlePreview, sort: Filters["sort"]) => {
  const sorted = [...articles];
  switch (sort) {
    case "title_asc":
      return sorted.sort((a, b) => a.title.localeCompare(b.title));
    case "title_desc":
      return sorted.sort((a, b) => b.title.localeCompare(a.title));
    case "created_asc":
      return sorted.sort(
        (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
      );
    case "created_desc":
    default:
      return sorted.sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      );
  }
};

export function ArticleWorkspace({
  initialArticles,
  filters,
  styleProfiles,
  ctas,
  planInfo,
}: Props) {
  const [localArticles, setLocalArticles] = useState<ArticlePreview>([]);
  const [usageCount, setUsageCount] = useState(planInfo.usage);
  const quotaLimit = planInfo.articleQuota;
  const quotaReached = quotaLimit !== null && usageCount >= quotaLimit;

  const filteredLocalArticles = useMemo(() => {
    if (localArticles.length === 0) {
      return localArticles;
    }
    return localArticles.filter((article) => matchesFilters(article, filters));
  }, [localArticles, filters]);

  const articles = useMemo(() => {
    if (filteredLocalArticles.length === 0) {
      return sortArticles(initialArticles, filters.sort);
    }

    const map = new Map<string, ArticlePreview[number]>();
    for (const article of initialArticles) {
      map.set(article.id, article);
    }
    for (const article of filteredLocalArticles) {
      map.set(article.id, article);
    }
    return sortArticles(Array.from(map.values()), filters.sort);
  }, [filteredLocalArticles, initialArticles, filters.sort]);

  const handleCreated = (article: ArticlePreview[number]) => {
    setUsageCount((prev) => prev + 1);
    if (!matchesFilters(article, filters)) {
      return;
    }
    setLocalArticles((prev) => [article, ...prev]);
  };

  return (
    <div className="space-y-8">
      <PlanUsageBanner
        planLabel={planInfo.planLabel}
        planId={planInfo.planId}
        usage={usageCount}
        limit={quotaLimit}
      />
      <ArticleComposer
        onCreated={handleCreated}
        styleProfiles={styleProfiles}
        ctas={ctas}
        quotaInfo={{
          usage: usageCount,
          limit: quotaLimit,
          planLabel: planInfo.planLabel,
          quotaReached,
          planId: planInfo.planId,
        }}
      />
      <ArticleList articles={articles} />
    </div>
  );
}

function PlanUsageBanner({
  planLabel,
  planId,
  usage,
  limit,
}: {
  planLabel: string;
  planId: string;
  usage: number;
  limit: number | null;
}) {
  const percentage = limit ? Math.min(100, Math.round((usage / limit) * 100)) : 0;
  return (
    <div className="rounded-2xl border border-zinc-100 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs uppercase tracking-widest text-zinc-500">現在のプラン</p>
          <p className="text-lg font-semibold text-zinc-900">{planLabel}</p>
          <p className="text-sm text-zinc-500">
            {limit === null ? "今月の生成上限はありません" : `今月 ${usage}/${limit} 記事を生成`}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {limit !== null && (
            <div className="w-40">
              <div className="h-2 rounded-full bg-zinc-100">
                <div
                  className="h-2 rounded-full bg-zinc-900"
                  style={{ width: `${percentage}%` }}
                />
              </div>
              <p className="mt-1 text-xs text-zinc-500">{percentage}%</p>
            </div>
          )}
          <Link
            href="/billing"
            className="text-sm font-medium text-zinc-900 underline-offset-2 hover:underline"
          >
            {planId === "enterprise"
              ? "プランを管理"
              : planId === "pro"
                ? "Enterprise相談"
                : "Proにアップグレード"}
          </Link>
        </div>
      </div>
    </div>
  );
}
