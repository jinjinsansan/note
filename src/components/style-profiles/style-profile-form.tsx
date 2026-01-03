"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

import type { StyleProfileSummary } from "@/types/style-profile";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const schema = z.object({
  profileName: z.string().min(2, "プロフィール名を入力してください"),
  tone: z.string().min(2, "希望するトーンを入力してください"),
  textStyle: z.string().min(2, "文体を入力してください"),
  vocabularyLevel: z.string().min(2, "語彙レベルを入力してください"),
  notes: z.string().optional(),
  sourceUrls: z
    .string()
    .min(1, "少なくとも1つのURLを入力してください")
    .refine((value) => value.split("\n").some((line) => line.trim().length > 0), "URLを入力してください")
    .refine((value) => {
      return value
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => line.length > 0)
        .every((line) => {
          try {
            new URL(line);
            return true;
          } catch {
            return false;
          }
        });
    }, "正しいURL形式で入力してください"),
});

type FormValues = z.infer<typeof schema>;

type Props = {
  onCreated: (profile: StyleProfileSummary) => void;
};

export function StyleProfileForm({ onCreated }: Props) {
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      profileName: "マイスタイル",
      tone: "エキスパートなのに親しみやすい",
      textStyle: "長文・ストーリー型",
      vocabularyLevel: "中級",
      notes: "",
      sourceUrls: "",
    },
  });

  const onSubmit = async (values: FormValues) => {
    setServerError(null);
    try {
      const body = {
        ...values,
        sourceUrls: values.sourceUrls
          .split("\n")
          .map((line) => line.trim())
          .filter((line) => line.length > 0),
      };

      const response = await fetch("/api/style-profiles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const payload = (await response.json()) as {
        profile?: StyleProfileSummary;
        error?: unknown;
      };

      if (!response.ok || !payload.profile) {
        throw new Error(
          typeof payload.error === "string"
            ? payload.error
            : "スタイルプロフィールの登録に失敗しました",
        );
      }

      onCreated(payload.profile);
      reset();
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
          <CardTitle>文章スタイル学習</CardTitle>
          <CardDescription>
            過去記事のURLを登録して、文章のトーンや構成をプロファイル化します。後続のAI生成で再利用できます。
          </CardDescription>
        </div>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="profileName">プロフィール名</Label>
            <Input id="profileName" placeholder="例: noteメインスタイル" {...register("profileName")} />
            {errors.profileName && (
              <p className="text-sm text-red-500">{errors.profileName.message}</p>
            )}
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="tone">トーン</Label>
              <Input id="tone" {...register("tone")} />
              {errors.tone && <p className="text-sm text-red-500">{errors.tone.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="textStyle">文体</Label>
              <Input id="textStyle" {...register("textStyle")} />
              {errors.textStyle && (
                <p className="text-sm text-red-500">{errors.textStyle.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="vocabularyLevel">語彙レベル</Label>
              <Input id="vocabularyLevel" {...register("vocabularyLevel")} />
              {errors.vocabularyLevel && (
                <p className="text-sm text-red-500">{errors.vocabularyLevel.message}</p>
              )}
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="sourceUrls">参考記事URL（1行1件）</Label>
            <textarea
              id="sourceUrls"
              rows={3}
              className="w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900"
              placeholder="https://note.com/...
https://note.com/..."
              {...register("sourceUrls")}
            />
            {errors.sourceUrls && (
              <p className="text-sm text-red-500">{errors.sourceUrls.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="notes">備考・メモ（任意）</Label>
            <textarea
              id="notes"
              rows={3}
              className="w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900"
              placeholder="このスタイルの特徴や気をつけたいポイント"
              {...register("notes")}
            />
          </div>
          {serverError && <p className="text-sm text-red-500">{serverError}</p>}
          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? "解析準備中..." : "スタイルプロフィールを保存"}
          </Button>
        </form>
      </CardHeader>
    </Card>
  );
}
