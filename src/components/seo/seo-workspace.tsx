"use client";

import { useEffect, useState } from "react";

import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

type KeywordSuggestion = {
  keyword: string;
  searchVolume: number;
  difficultyScore: number;
  trendScore: number;
  difficultyLevel: string;
  rationale: string;
};

type TitleSuggestion = {
  id: string;
  title: string;
  difficultyLevel: string;
  seoScore: number;
  hook: string;
};

export function SeoWorkspace() {
  const [categories, setCategories] = useState<string[]>([]);
  const [category, setCategory] = useState("マーケティング");
  const [seed, setSeed] = useState("");
  const [keywords, setKeywords] = useState<KeywordSuggestion[]>([]);
  const [keywordError, setKeywordError] = useState<string | null>(null);
  const [isLoadingKeywords, setIsLoadingKeywords] = useState(false);

  const [selectedKeyword, setSelectedKeyword] = useState<string>("");
  const [titles, setTitles] = useState<TitleSuggestion[]>([]);
  const [titleError, setTitleError] = useState<string | null>(null);
  const [isLoadingTitles, setIsLoadingTitles] = useState(false);

  useEffect(() => {
    fetch("/api/seo/categories")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data.categories)) {
          setCategories(data.categories);
          if (!data.categories.includes(category)) {
            setCategory(data.categories[0] ?? "");
          }
        }
      })
      .catch(() => {
        setCategories([]);
      });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleGenerateKeywords = async (event: React.FormEvent) => {
    event.preventDefault();
    setKeywordError(null);
    setIsLoadingKeywords(true);
    setTitles([]);
    setSelectedKeyword("");
    try {
      const response = await fetch("/api/seo/generate-keywords", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category, seed: seed.trim() || undefined }),
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error ?? "キーワード生成に失敗しました");
      }
      setKeywords(payload.keywords ?? []);
    } catch (error) {
      setKeywordError(
        error instanceof Error ? error.message : "問題が発生しました。再度お試しください。",
      );
    } finally {
      setIsLoadingKeywords(false);
    }
  };

  const handleGenerateTitles = async (keyword: string) => {
    setSelectedKeyword(keyword);
    setIsLoadingTitles(true);
    setTitleError(null);
    try {
      const response = await fetch("/api/seo/generate-titles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keyword }),
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error ?? "タイトル生成に失敗しました");
      }
      setTitles(payload.titles ?? []);
    } catch (error) {
      setTitleError(
        error instanceof Error ? error.message : "タイトル生成で問題が発生しました",
      );
    } finally {
      setIsLoadingTitles(false);
    }
  };

  return (
    <div className="space-y-8">
      <Card>
        <CardHeader className="space-y-4">
          <div className="space-y-2">
            <CardTitle>SEOキーワード探索</CardTitle>
            <CardDescription>
              noteカテゴリーと共通語彙をもとに、検索ボリュームと難易度スコア付きの候補を提示します。
            </CardDescription>
          </div>
          <form onSubmit={handleGenerateKeywords} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="seo-category">カテゴリー</Label>
                <select
                  id="seo-category"
                  className="h-10 w-full rounded-md border border-zinc-200 bg-white px-3 text-sm"
                  value={category}
                  onChange={(event) => setCategory(event.target.value)}
                >
                  {categories.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="keyword-seed">任意のテーマ</Label>
                <Input
                  id="keyword-seed"
                  placeholder="例: BtoB SaaS"
                  value={seed}
                  onChange={(event) => setSeed(event.target.value)}
                />
              </div>
            </div>
            {keywordError && <p className="text-sm text-red-500">{keywordError}</p>}
            <Button type="submit" disabled={isLoadingKeywords} className="w-full">
              {isLoadingKeywords ? "分析中..." : "キーワード候補を生成"}
            </Button>
          </form>
        </CardHeader>
      </Card>

      {keywords.length > 0 && (
        <Card>
          <CardHeader className="space-y-4">
            <div className="space-y-2">
              <CardTitle>候補リスト</CardTitle>
              <CardDescription>各キーワードからタイトル案を生成し、記事化の優先順位を決められます。</CardDescription>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[600px] text-sm">
                <thead>
                  <tr className="text-left text-zinc-500">
                    <th className="pb-2">キーワード</th>
                    <th className="pb-2">検索ボリューム</th>
                    <th className="pb-2">難易度</th>
                    <th className="pb-2">トレンド</th>
                    <th className="pb-2" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {keywords.map((item) => (
                    <tr key={item.keyword} className="align-top">
                      <td className="py-3 font-medium text-zinc-900">{item.keyword}</td>
                      <td className="py-3">{item.searchVolume.toLocaleString()}</td>
                      <td className="py-3 capitalize">
                        {item.difficultyLevel} ({item.difficultyScore})
                      </td>
                      <td className="py-3">{item.trendScore}</td>
                      <td className="py-3 text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleGenerateTitles(item.keyword)}
                          disabled={isLoadingTitles && selectedKeyword === item.keyword}
                        >
                          {isLoadingTitles && selectedKeyword === item.keyword
                            ? "生成中"
                            : "タイトル生成"}
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardHeader>
        </Card>
      )}

      {titles.length > 0 && (
        <Card>
          <CardHeader className="space-y-4">
            <div className="space-y-2">
              <CardTitle>タイトル案 ({selectedKeyword})</CardTitle>
              <CardDescription>
                難易度とSEOスコアを参考に、記事生成ワークスペースへ回すタイトルを決めましょう。
              </CardDescription>
            </div>
            {titleError && <p className="text-sm text-red-500">{titleError}</p>}
            <div className="space-y-3">
              {titles.map((title) => (
                <div
                  key={title.id}
                  className="rounded-xl border border-zinc-100 bg-zinc-50 px-4 py-3 text-sm text-zinc-800"
                >
                  <div className="font-medium text-zinc-900">{title.title}</div>
                  <div className="text-xs text-zinc-500">
                    難易度: {title.difficultyLevel} / SEOスコア: {title.seoScore}
                  </div>
                  {title.hook && <p className="text-xs text-zinc-500">狙い: {title.hook}</p>}
                </div>
              ))}
            </div>
          </CardHeader>
        </Card>
      )}
    </div>
  );
}
