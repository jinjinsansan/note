"use client";

import { useMemo, useState } from "react";

import type { ArticleSummary } from "@/types/article";
import type { CtaSummary } from "@/types/cta";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AutomationJobFeed } from "@/components/automation/automation-job-feed";

type Props = {
  articles: ArticleSummary[];
  ctas: CtaSummary[];
};

type SelectedArticle = {
  id: string;
  ctaId?: string;
  schedule?: string;
};

const formatDateTimeLocal = (date: Date) => {
  const tzOffset = date.getTimezoneOffset() * 60000;
  const localISOTime = new Date(date.getTime() - tzOffset).toISOString().slice(0, 16);
  return localISOTime;
};

export function BulkPublishWorkspace({ articles, ctas }: Props) {
  const [selected, setSelected] = useState<Record<string, SelectedArticle>>({});
  const [defaultSchedule, setDefaultSchedule] = useState(() => formatDateTimeLocal(new Date()));
  const [selectedCta, setSelectedCta] = useState<string>(ctas[0]?.id ?? "");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [serverSuccess, setServerSuccess] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState(0);

  const toggleArticle = (articleId: string) => {
    setSelected((prev) => {
      const next = { ...prev };
      if (next[articleId]) {
        delete next[articleId];
      } else {
        next[articleId] = {
          id: articleId,
          ctaId: selectedCta || undefined,
          schedule: defaultSchedule,
        };
      }
      return next;
    });
  };

  const updateArticleSetting = (
    articleId: string,
    field: "ctaId" | "schedule",
    value: string | undefined,
  ) => {
    setSelected((prev) => ({
      ...prev,
      [articleId]: {
        ...(prev[articleId] ?? { id: articleId }),
        [field]: value,
      },
    }));
  };

  const selectedArticles = Object.values(selected);
  const selectedIds = useMemo(() => new Set(Object.keys(selected)), [selected]);

  const handleBulkScheduleUpdate = () => {
    setSelected((prev) => {
      const next: typeof prev = {};
      for (const [articleId, settings] of Object.entries(prev)) {
        next[articleId] = { ...settings, schedule: defaultSchedule };
      }
      return next;
    });
  };

  const handleBulkCtaUpdate = () => {
    setSelected((prev) => {
      const next: typeof prev = {};
      for (const [articleId, settings] of Object.entries(prev)) {
        next[articleId] = { ...settings, ctaId: selectedCta || undefined };
      }
      return next;
    });
  };

  const handleSubmit = async () => {
    if (selectedArticles.length === 0) return;
    setIsSubmitting(true);
    setServerError(null);
    setServerSuccess(null);
    try {
      const articlePayload = selectedArticles.map(({ id, ctaId, schedule }) => {
        const payload: SelectedArticle = { id };
        if (ctaId) {
          payload.ctaId = ctaId;
        }
        if (schedule) {
          const parsed = new Date(schedule);
          if (Number.isNaN(parsed.getTime())) {
            throw new Error("投稿時刻の形式が正しくありません");
          }
          payload.schedule = parsed.toISOString();
        }
        return payload;
      });

      const response = await fetch("/api/articles/bulk-publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ articles: articlePayload }),
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error ?? "一括投稿に失敗しました");
      }
      setServerSuccess("一括投稿を受付けました。投稿キューを確認してください。");
      setRefreshToken(Date.now());
    } catch (error) {
      setServerError(error instanceof Error ? error.message : "一括投稿に失敗しました");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-2 text-sm text-zinc-600">
              <span>まとめて設定する投稿時刻</span>
              <Input
                type="datetime-local"
                value={defaultSchedule}
                onChange={(event) => setDefaultSchedule(event.target.value)}
              />
            </label>
            <label className="space-y-2 text-sm text-zinc-600">
              <span>まとめて設定するCTA</span>
              <select
                className="h-10 w-full rounded-md border border-zinc-200 bg-white px-3 text-sm"
                value={selectedCta}
                onChange={(event) => setSelectedCta(event.target.value)}
              >
                <option value="">CTAなし</option>
                {ctas.map((cta) => (
                  <option key={cta.id} value={cta.id}>
                    {cta.cta_name}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="flex flex-wrap gap-3 text-sm text-zinc-600">
            <Button type="button" variant="outline" size="sm" onClick={handleBulkScheduleUpdate}>
              選択中の記事に時刻を反映
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={handleBulkCtaUpdate}>
              選択中の記事にCTAを反映
            </Button>
            <span className="text-zinc-500">選択中: {selectedArticles.length} / 30</span>
          </div>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader className="space-y-4">
          <div className="space-y-2">
            <CardTitle>投稿対象記事</CardTitle>
            <CardDescription>
              「承認待ち」または「承認済み」の記事が表示されています。最大30件まで選択できます。
            </CardDescription>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-zinc-500">
                  <th className="pb-2">選択</th>
                  <th className="pb-2">タイトル</th>
                  <th className="pb-2">ステータス</th>
                  <th className="pb-2">CTA</th>
                  <th className="pb-2">投稿時刻</th>
                  <th className="pb-2">note連携</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {articles.map((article) => {
                  const isSelected = selectedIds.has(article.id);
                  const settings = selected[article.id];
                  return (
                    <tr key={article.id} className="align-top">
                      <td className="py-3">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleArticle(article.id)}
                          disabled={!isSelected && selectedArticles.length >= 30}
                        />
                      </td>
                      <td className="py-3">
                        <p className="font-medium text-zinc-900">{article.title}</p>
                        <p className="text-xs text-zinc-500">
                          作成日: {new Date(article.created_at).toLocaleDateString("ja-JP")}
                        </p>
                      </td>
                      <td className="py-3">
                        <span className="rounded-full bg-zinc-100 px-2 py-1 text-xs font-semibold text-zinc-700">
                          {article.status}
                        </span>
                      </td>
                      <td className="py-3">
                        {isSelected ? (
                          <select
                            className="h-9 rounded-md border border-zinc-200 bg-white px-2 text-sm"
                            value={settings?.ctaId ?? ""}
                            onChange={(event) =>
                              updateArticleSetting(
                                article.id,
                                "ctaId",
                                event.target.value || undefined,
                              )
                            }
                          >
                            <option value="">CTAなし</option>
                            {ctas.map((cta) => (
                              <option key={cta.id} value={cta.id}>
                                {cta.cta_name}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <span className="text-sm text-zinc-500">
                            {article.cta_id ? "既存のCTA設定あり" : "未設定"}
                          </span>
                        )}
                      </td>
                      <td className="py-3">
                        {isSelected ? (
                          <Input
                            type="datetime-local"
                            value={settings?.schedule ?? defaultSchedule}
                            onChange={(event) =>
                              updateArticleSetting(article.id, "schedule", event.target.value)
                            }
                          />
                        ) : (
                          <span className="text-sm text-zinc-500">
                            {article.scheduled_publish_at
                              ? new Date(article.scheduled_publish_at).toLocaleString("ja-JP")
                              : "未設定"}
                          </span>
                        )}
                      </td>
                      <td className="py-3 text-sm text-zinc-600">
                        {article.note_article_url ? (
                          <a
                            href={article.note_article_url}
                            className="text-zinc-900 underline"
                            target="_blank"
                            rel="noreferrer"
                          >
                            noteで表示
                          </a>
                        ) : article.note_account_id ? (
                          "noteアカウント連携済み"
                        ) : (
                          "未連携"
                        )}
                      </td>
                    </tr>
                  );
                })}
                {articles.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-6 text-center text-sm text-zinc-500">
                      承認待ち/承認済みの記事がありません。
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardHeader>
      </Card>

      {serverError && <p className="text-sm text-red-500">{serverError}</p>}
      {serverSuccess && <p className="text-sm text-green-600">{serverSuccess}</p>}

      <Button
        type="button"
        className="w-full"
        disabled={isSubmitting || selectedArticles.length === 0}
        onClick={handleSubmit}
      >
        {isSubmitting ? "投稿キューに追加中..." : "選択した記事を投稿キューへ追加"}
      </Button>

      <AutomationJobFeed refreshToken={refreshToken} />
    </div>
  );
}
