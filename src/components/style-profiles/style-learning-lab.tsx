"use client";

import { useState } from "react";

import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { StyleAnalysisResponse } from "@/types/learning";
import type { StyleProfileSummary } from "@/types/style-profile";

type Props = {
  onProfileCreated: (profile: StyleProfileSummary) => void;
};

const MAX_SAMPLES = 3;

type SampleInput = {
  source: string;
  content: string;
};

const defaultSamples: SampleInput[] = Array.from({ length: MAX_SAMPLES }, () => ({
  source: "",
  content: "",
}));

export function StyleLearningLab({ onProfileCreated }: Props) {
  const [profileName, setProfileName] = useState("マイスタイル");
  const [samples, setSamples] = useState<SampleInput[]>(defaultSamples);
  const [analysis, setAnalysis] = useState<StyleAnalysisResponse | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [fetchingIndex, setFetchingIndex] = useState<number | null>(null);

  const updateSample = (index: number, field: keyof SampleInput, value: string) => {
    setSamples((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const handleAnalyze = async () => {
    setError(null);
    setSuccess(null);
    setIsAnalyzing(true);
    setAnalysis(null);
    try {
      const normalized = samples.filter((sample) => sample.content.trim().length > 0);
      if (normalized.length === 0) {
        throw new Error("少なくとも1つの文章を入力してください");
      }

      const response = await fetch("/api/learning/analyze-articles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          profileName: profileName.trim() || "マイスタイル",
          articles: normalized,
        }),
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(
          typeof payload.error === "string" ? payload.error : "スタイル分析に失敗しました",
        );
      }
      setAnalysis(payload as StyleAnalysisResponse);
    } catch (err) {
      setError(err instanceof Error ? err.message : "スタイル分析に失敗しました");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!analysis) return;
    setIsSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const sourceUrls = analysis.samples.map((sample, index) => {
        if (sample.source && sample.source.trim().length > 0) {
          return sample.source.trim();
        }
        return `https://note.auto/local/sample-${index + 1}`;
      });

      const response = await fetch("/api/style-profiles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          profileName: analysis.profileName,
          tone: analysis.tone,
          textStyle: analysis.textStyle,
          vocabularyLevel: analysis.vocabularyLevel,
          notes: analysis.summary,
          sourceUrls,
          analysis,
        }),
      });
      const payload = await response.json();
      if (!response.ok || !payload.profile) {
        throw new Error(payload.error ?? "プロフィール保存に失敗しました");
      }
      onProfileCreated(payload.profile as StyleProfileSummary);
      setSuccess("スタイルプロフィールを保存しました");
    } catch (err) {
      setError(err instanceof Error ? err.message : "プロフィール保存に失敗しました");
    } finally {
      setIsSaving(false);
    }
  };

  const handleFetchFromUrl = async (index: number) => {
    setError(null);
    setSuccess(null);
    const url = samples[index]?.source.trim();
    if (!url) {
      setError("先にnote記事のURLを入力してください");
      return;
    }
    setFetchingIndex(index);
    try {
      const response = await fetch("/api/learning/fetch-article", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(
          typeof payload.error === "string"
            ? payload.error
            : "noteから本文を取得できませんでした",
        );
      }
      setSamples((prev) => {
        const next = [...prev];
        next[index] = {
          source: payload.url ?? url,
          content: payload.content ?? prev[index]?.content ?? "",
        };
        return next;
      });
      setSuccess("note記事から本文を読み込みました");
    } catch (err) {
      setError(err instanceof Error ? err.message : "noteから本文を取得できませんでした");
    } finally {
      setFetchingIndex(null);
    }
  };

  return (
    <Card>
      <CardHeader className="space-y-5">
        <div className="space-y-2">
          <CardTitle>スタイル学習ラボ</CardTitle>
          <CardDescription>
            過去の文章を貼り付けるだけで、AIが文体の特徴を解析し、プロフィール化します。
          </CardDescription>
        </div>
        <div className="space-y-3">
          <Input
            value={profileName}
            onChange={(event) => setProfileName(event.target.value)}
            placeholder="プロフィール名 (例: note長文コラム)"
          />
          <div className="space-y-3">
            {samples.map((sample, index) => (
              <div key={index} className="space-y-2">
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Input
                    placeholder={`記事のURL (${index + 1})`}
                    value={sample.source}
                    onChange={(event) => updateSample(index, "source", event.target.value)}
                    className="sm:flex-1"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    className="sm:w-40"
                    onClick={() => handleFetchFromUrl(index)}
                    disabled={fetchingIndex === index}
                  >
                    {fetchingIndex === index ? "取得中..." : "URLから取得"}
                  </Button>
                </div>
                <textarea
                  className="h-28 w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm"
                  placeholder="本文を200文字以上貼り付けてください"
                  value={sample.content}
                  onChange={(event) => updateSample(index, "content", event.target.value)}
                />
              </div>
            ))}
          </div>
          <Button onClick={handleAnalyze} disabled={isAnalyzing} className="w-full">
            {isAnalyzing ? "解析中..." : "スタイルを解析"}
          </Button>
          {error && <p className="text-sm text-red-500">{error}</p>}
          {analysis && (
            <div className="space-y-3 rounded-2xl border border-zinc-100 bg-zinc-50 p-4 text-sm">
              <div>
                <p className="text-xs uppercase tracking-widest text-zinc-500">Tone</p>
                <p className="text-lg font-semibold text-zinc-900">{analysis.tone}</p>
                <p className="text-xs text-zinc-500">{analysis.summary}</p>
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                <div>
                  <p className="text-xs text-zinc-500">平均文長</p>
                  <p className="text-base font-semibold text-zinc-900">
                    {analysis.stats.averageSentenceLength.toFixed(1)} 語
                  </p>
                </div>
                <div>
                  <p className="text-xs text-zinc-500">段落長</p>
                  <p className="text-base font-semibold text-zinc-900">
                    {analysis.stats.averageParagraphLength.toFixed(1)} 語
                  </p>
                </div>
                <div>
                  <p className="text-xs text-zinc-500">句読点密度</p>
                  <p className="text-base font-semibold text-zinc-900">
                    {(analysis.stats.punctuationDensity * 100).toFixed(1)}%
                  </p>
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                {[
                  { label: "漢字", value: analysis.stats.charRatios.kanji },
                  { label: "ひらがな", value: analysis.stats.charRatios.hiragana },
                  { label: "カタカナ", value: analysis.stats.charRatios.katakana },
                ].map((ratio) => (
                  <div key={ratio.label}>
                    <p className="text-xs text-zinc-500">{ratio.label}比率</p>
                    <p className="text-base font-semibold text-zinc-900">
                      {(ratio.value * 100).toFixed(0)}%
                    </p>
                  </div>
                ))}
                <div>
                  <p className="text-xs text-zinc-500">文末傾向</p>
                  <p className="text-base font-semibold text-zinc-900">
                    {analysis.stats.sentenceEnding.dominant}
                  </p>
                  <p className="text-xs text-zinc-500">
                    ですます {(analysis.stats.sentenceEnding.desuMasuRatio * 100).toFixed(0)}% /
                    だである {(analysis.stats.sentenceEnding.daDeAruRatio * 100).toFixed(0)}%
                  </p>
                </div>
              </div>
              {analysis.topWords.length > 0 && (
                <div>
                  <p className="text-xs uppercase tracking-widest text-zinc-500">頻出ワード</p>
                  <div className="flex flex-wrap gap-2 pt-1 text-xs">
                    {analysis.topWords.slice(0, 8).map((word) => (
                      <span
                        key={word.word}
                        className="rounded-full border border-zinc-200 bg-white px-3 py-1"
                      >
                        {word.word} ({word.count})
                      </span>
                    ))}
                  </div>
                </div>
              )}
              <div className="space-y-2">
                <p className="text-xs uppercase tracking-widest text-zinc-500">サンプル分析</p>
                <div className="space-y-2">
                  {analysis.samples.map((sample, index) => (
                    <div
                      key={`${sample.source}-${index}`}
                      className="rounded-xl border border-zinc-100 bg-white px-3 py-2"
                    >
                      <p className="text-sm font-medium text-zinc-900">{sample.source || "カスタム"}</p>
                      <p className="text-xs text-zinc-500">
                        文長 {sample.metrics.averageSentenceLength.toFixed(1)} ・ 語彙多様性
                        {(sample.metrics.uniqueWordRatio * 100).toFixed(0)}%
                      </p>
                      <p className="text-xs text-zinc-500">
                        漢字 {(sample.metrics.charRatios.kanji * 100).toFixed(0)}% / ひらがな
                        {(sample.metrics.charRatios.hiragana * 100).toFixed(0)}% ・ 文末
                        {sample.metrics.sentenceEnding.dominant}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
              <Button
                variant="outline"
                className="w-full"
                disabled={isSaving}
                onClick={handleSaveProfile}
              >
                {isSaving ? "保存中..." : "この解析をプロフィールに追加"}
              </Button>
              {success && <p className="text-sm text-green-600">{success}</p>}
            </div>
          )}
        </div>
      </CardHeader>
    </Card>
  );
}
