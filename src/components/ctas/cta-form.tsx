"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

import type { CtaSummary } from "@/types/cta";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const schema = z.object({
  name: z.string().min(2, "CTA名を入力してください"),
  content: z.string().min(10, "本文を入力してください"),
  link: z.string().url("有効なURLを入力してください"),
});

type FormValues = z.infer<typeof schema>;

type Props = {
  onCreated: (cta: CtaSummary) => void;
};

export function CtaForm({ onCreated }: Props) {
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: "デジタル資料請求",
      content: "資料請求はこちらから。note限定の特典付きでご案内します。",
      link: "https://example.com",
    },
  });

  const onSubmit = async (values: FormValues) => {
    setServerError(null);
    try {
      const response = await fetch("/api/ctas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const payload = (await response.json()) as { cta?: CtaSummary; error?: unknown };

      if (!response.ok || !payload.cta) {
        throw new Error(
          typeof payload.error === "string" ? payload.error : "CTAの登録に失敗しました",
        );
      }

      onCreated(payload.cta);
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
          <CardTitle>CTAテンプレート</CardTitle>
          <CardDescription>
            記事に差し込むCTA文面を保存しておき、生成ワークフローで呼び出せるようにします。
          </CardDescription>
        </div>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="cta-name">CTA名</Label>
            <Input id="cta-name" {...register("name")} />
            {errors.name && <p className="text-sm text-red-500">{errors.name.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="cta-content">本文</Label>
            <textarea
              id="cta-content"
              rows={3}
              className="w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900"
              {...register("content")}
            />
            {errors.content && <p className="text-sm text-red-500">{errors.content.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="cta-link">リンクURL</Label>
            <Input id="cta-link" placeholder="https://" {...register("link")} />
            {errors.link && <p className="text-sm text-red-500">{errors.link.message}</p>}
          </div>
          {serverError && <p className="text-sm text-red-500">{serverError}</p>}
          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? "保存中..." : "CTAを追加"}
          </Button>
        </form>
      </CardHeader>
    </Card>
  );
}
