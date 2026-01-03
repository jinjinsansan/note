"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { StyleProfileSummary } from "@/types/style-profile";
import type { CtaSummary } from "@/types/cta";

const schema = z.object({
  title: z.string().min(5, "タイトルは5文字以上で入力してください"),
  category: z.string().min(2, "カテゴリーを入力してください"),
  tone: z.string().min(2, "トーンを入力してください"),
  brief: z.string().min(30, "記事の概要を30文字以上入力してください"),
  length: z.enum(["short", "medium", "long"]),
  styleProfileId: z.string().uuid().optional().or(z.literal("")),
  ctaId: z.string().uuid().optional().or(z.literal("")),
  keywordsInput: z.string().optional(),
  generateImages: z.boolean().optional(),
});

type FormValues = z.infer<typeof schema>;

type Props = {
  onCreated: (article: {
    id: string;
    title: string;
    category: string | null;
    status: string;
    word_count: number | null;
    meta_description: string | null;
    created_at: string;
    updated_at: string;
  }) => void;
  styleProfiles: StyleProfileSummary[];
  ctas: CtaSummary[];
  quotaInfo: {
    usage: number;
    limit: number | null;
    planLabel: string;
    quotaReached: boolean;
    planId: string;
  };
};

export function ArticleComposer({ onCreated, styleProfiles, ctas, quotaInfo }: Props) {
  const [serverError, setServerError] = useState<string | null>(null);
  const styleProfileMap = useMemo(() => {
    const map = new Map<string, StyleProfileSummary>();
    for (const profile of styleProfiles) {
      map.set(profile.id, profile);
    }
    return map;
  }, [styleProfiles]);
  const ctaMap = useMemo(() => {
    const map = new Map<string, CtaSummary>();
    for (const cta of ctas) {
      map.set(cta.id, cta);
    }
    return map;
  }, [ctas]);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: "",
      category: "マーケティング",
      tone: "専門的だが親しみやすい",
      brief: "",
      length: "medium",
      styleProfileId: "",
      ctaId: "",
      keywordsInput: "",
      generateImages: quotaInfo.planId !== "free",
    },
  });

  const selectedProfileId = watch("styleProfileId");
  const selectedProfile = selectedProfileId ? styleProfileMap.get(selectedProfileId) : null;
  const selectedCtaId = watch("ctaId");
  const selectedCta = selectedCtaId ? ctaMap.get(selectedCtaId) : null;
  const quotaLimit = quotaInfo.limit;
  const [quotaExceeded, setQuotaExceeded] = useState(quotaInfo.quotaReached);
  const canGenerateImages = quotaInfo.planId !== "free";

  useEffect(() => {
    setQuotaExceeded(quotaInfo.quotaReached);
  }, [quotaInfo.quotaReached]);

  const onSubmit = async (values: FormValues) => {
    if (quotaExceeded) {
      setServerError("今月の生成上限に達しています。プランをアップグレードしてください。");
      return;
    }
    setServerError(null);
    try {
      const keywords = values.keywordsInput
        ?.split(/[,\n]/)
        .map((keyword) => keyword.trim())
        .filter((keyword) => keyword.length > 0)
        .slice(0, 5) ?? [];

      const requestPayload = {
        title: values.title,
        category: values.category,
        tone: values.tone,
        brief: values.brief,
        length: values.length,
        styleProfileId: values.styleProfileId || undefined,
        ctaId: values.ctaId || undefined,
        keywords: keywords.length ? keywords : undefined,
        generateImages: canGenerateImages ? Boolean(values.generateImages) : false,
      };

      const response = await fetch("/api/articles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestPayload),
      });
      const responsePayload = await response.json();
      if (!response.ok) {
        if (response.status === 402) {
          setServerError(
            typeof responsePayload.error === "string"
              ? responsePayload.error
              : "今月の生成可能数に達しました。プランをご確認ください。",
          );
          setQuotaExceeded(true);
          return;
        }
        throw new Error(
          typeof responsePayload.error === "string"
            ? responsePayload.error
            : "記事の生成に失敗しました",
        );
      }
      onCreated(responsePayload.article);
      reset({
        title: "",
        category: values.category,
        tone: values.tone,
        brief: "",
        length: values.length,
        styleProfileId: values.styleProfileId,
        ctaId: values.ctaId,
        keywordsInput: "",
        generateImages: values.generateImages,
      });
    } catch (error) {
      setServerError(
        error instanceof Error
          ? error.message
          : "問題が発生しました。時間をおいて再度お試しください。",
      );
    }
  };

  return (
    <Card>
      <CardHeader className="space-y-4">
        <div className="space-y-2">
          <CardTitle>AI記事生成（ベータ）</CardTitle>
          <CardDescription>
            タイトル・トーン・概要を入力すると、Supabaseに下書きが保存されます。後からCTAや画像を追加できます。
          </CardDescription>
        </div>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="rounded-xl border border-zinc-100 bg-zinc-50 px-4 py-3 text-sm text-zinc-600">
          {quotaLimit === null ? (
            <p>
              {quotaInfo.planLabel} プランでは記事生成数に制限はありません。
            </p>
          ) : (
            <p>
              今月 {quotaInfo.usage}/{quotaLimit} 本を生成済み
              {quotaExceeded && (
                <span className="text-red-500">
                  {" "}— 上限に達しました。<Link className="underline" href="/billing">プランをアップグレード</Link>
                  してください。
                </span>
              )}
            </p>
          )}
        </div>
          <div className="space-y-2">
            <Label htmlFor="title">タイトル</Label>
            <Input id="title" placeholder="note読者が興味を持つタイトル" {...register("title")} />
            {errors.title && <p className="text-sm text-red-500">{errors.title.message}</p>}
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="category">カテゴリー</Label>
              <Input id="category" placeholder="マーケティング" {...register("category")} />
              {errors.category && (
                <p className="text-sm text-red-500">{errors.category.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="tone">トーン設定</Label>
              <Input
                id="tone"
                placeholder="専門的だが親しみやすい"
                {...register("tone")}
              />
              {errors.tone && <p className="text-sm text-red-500">{errors.tone.message}</p>}
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="brief">概要・要望</Label>
            <textarea
              id="brief"
              rows={4}
              className={cn(
                "w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900",
              )}
              placeholder="読者の課題や盛り込みたいポイントを記載してください"
              {...register("brief")}
            />
            {errors.brief && <p className="text-sm text-red-500">{errors.brief.message}</p>}
          </div>
          <div className="space-y-2">
            <Label>文字数</Label>
            <div className="flex flex-wrap gap-3">
              {[
                { value: "short", label: "短文 (約2000文字)" },
                { value: "medium", label: "中文 (約4000文字)" },
                { value: "long", label: "長文 (約6000文字)" },
              ].map((option) => (
                <label
                  key={option.value}
                  className="flex cursor-pointer items-center gap-2 rounded-full border border-zinc-200 px-4 py-2 text-sm"
                >
                  <input
                    type="radio"
                    value={option.value}
                    className="text-zinc-900"
                    {...register("length")}
                  />
                  {option.label}
                </label>
              ))}
            </div>
            {errors.length && <p className="text-sm text-red-500">{errors.length.message}</p>}
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="styleProfileId">スタイルプロファイル</Label>
              <select
                id="styleProfileId"
                className="h-10 w-full rounded-md border border-zinc-200 bg-white px-3 text-sm"
                {...register("styleProfileId")}
              >
                <option value="">未選択</option>
                {styleProfiles.map((profile) => (
                  <option key={profile.id} value={profile.id}>
                    {profile.profile_name}
                  </option>
                ))}
              </select>
              {selectedProfile && (
                <p className="text-xs text-zinc-500">
                  {selectedProfile.tone} / {selectedProfile.text_style} / 語彙:{" "}
                  {selectedProfile.vocabulary_level}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="ctaId">CTAテンプレート</Label>
              <select
                id="ctaId"
                className="h-10 w-full rounded-md border border-zinc-200 bg-white px-3 text-sm"
                {...register("ctaId")}
              >
                <option value="">未選択</option>
                {ctas.map((cta) => (
                  <option key={cta.id} value={cta.id}>
                    {cta.cta_name}
                  </option>
                ))}
              </select>
              {selectedCta && (
                <p className="text-xs text-zinc-500">
                  {selectedCta.cta_content.slice(0, 60)}...
                </p>
              )}
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="keywordsInput">SEOキーワード</Label>
            <textarea
              id="keywordsInput"
              rows={2}
              className={cn(
                "w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900",
              )}
              placeholder="note自動化, コンテンツ運用, BtoBマーケ"
              {...register("keywordsInput")}
            />
            <p className="text-xs text-zinc-500">カンマまたは改行区切り、最大5件まで反映されます。</p>
          </div>
          <label className="flex items-center gap-3 rounded-xl border border-zinc-100 bg-zinc-50 px-4 py-3 text-sm text-zinc-700">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-zinc-300 text-zinc-900 focus:ring-black"
              {...register("generateImages")}
              disabled={!canGenerateImages}
            />
            <span>
              見出し画像を自動生成
              {!canGenerateImages && "（Pro以上で利用可能）"}
            </span>
          </label>

          {serverError && <p className="text-sm text-red-500">{serverError}</p>}
          <Button type="submit" className="w-full" disabled={isSubmitting || quotaExceeded}>
            {quotaExceeded ? "生成上限に達しました" : isSubmitting ? "生成中..." : "AIで下書きを作成"}
          </Button>
        </form>
      </CardHeader>
    </Card>
  );
}
