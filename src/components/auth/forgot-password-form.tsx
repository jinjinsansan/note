"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const schema = z.object({
  email: z.string().email("有効なメールアドレスを入力してください"),
});

type FormValues = z.infer<typeof schema>;

export function ForgotPasswordForm() {
  const [serverError, setServerError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: "" },
  });

  const onSubmit = async (values: FormValues) => {
    setServerError(null);
    setSuccessMessage(null);
    try {
      const response = await fetch("/api/auth/reset-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(
          typeof payload.error === "string"
            ? payload.error
            : "リセットメールの送信に失敗しました",
        );
      }
      setSuccessMessage(
        "入力したメールアドレス宛にパスワード再設定用リンクを送信しました。",
      );
      reset();
    } catch (error) {
      setServerError(
        error instanceof Error ? error.message : "処理中に問題が発生しました",
      );
    }
  };

  return (
    <div className="space-y-6 p-6">
      <div className="space-y-1">
        <h2 className="text-xl font-semibold text-zinc-900">パスワードをリセット</h2>
        <p className="text-sm text-zinc-500">
          アカウントに登録したメールアドレスを入力すると、再設定用のリンクが送信されます。
        </p>
      </div>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor="reset-email">メールアドレス</Label>
          <Input
            id="reset-email"
            type="email"
            placeholder="name@example.com"
            autoComplete="email"
            {...register("email")}
          />
          {errors.email && <p className="text-sm text-red-500">{errors.email.message}</p>}
        </div>

        {serverError && <p className="text-sm text-red-500">{serverError}</p>}
        {successMessage && <p className="text-sm text-green-600">{successMessage}</p>}

        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? "送信中..." : "リセットリンクを送信"}
        </Button>
      </form>
    </div>
  );
}
