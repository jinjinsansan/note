"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SocialLoginButtons } from "@/components/auth/social-login-buttons";

const schema = z.object({
  email: z.string().email("有効なメールアドレスを入力してください"),
  username: z
    .string()
    .min(3, "ユーザー名は3文字以上で入力してください")
    .max(30, "ユーザー名が長すぎます"),
  password: z
    .string()
    .min(8, "8文字以上のパスワードを設定してください")
    .regex(
      /^(?=.*[a-zA-Z])(?=.*\d).+$/,
      "英字と数字をそれぞれ1文字以上含めてください",
    ),
});

type SignupValues = z.infer<typeof schema>;

export function SignupForm() {
  const [serverError, setServerError] = useState<string | null>(null);
  const [serverSuccess, setServerSuccess] = useState<string | null>(null);
  const router = useRouter();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<SignupValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      email: "",
      username: "",
      password: "",
    },
  });

  const onSubmit = async (values: SignupValues) => {
    setServerError(null);
    setServerSuccess(null);
    try {
      const response = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(
          typeof payload.error === "string"
            ? payload.error
            : "登録に失敗しました。",
        );
      }

      setServerSuccess(
        payload.message ?? "仮登録が完了しました。メールをご確認ください。",
      );
      reset({ email: values.email, username: values.username, password: "" });
      setTimeout(() => router.push("/login"), 800);
    } catch (error) {
      console.error(error);
      setServerError(
        error instanceof Error
          ? error.message
          : "問題が発生しました。時間をおいて再度お試しください。",
      );
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h2 className="text-xl font-semibold text-zinc-900">アカウント作成</h2>
        <p className="text-sm text-zinc-500">
          メール認証を行い、note自動投稿AIの利用を始めましょう。
        </p>
      </div>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor="email">メールアドレス</Label>
          <Input
            id="email"
            type="email"
            placeholder="name@example.com"
            autoComplete="email"
            {...register("email")}
          />
          {errors.email && (
            <p className="text-sm text-red-500">{errors.email.message}</p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="username">ユーザー名</Label>
          <Input
            id="username"
            placeholder="noteクリエイター名"
            autoComplete="username"
            {...register("username")}
          />
          {errors.username && (
            <p className="text-sm text-red-500">{errors.username.message}</p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">パスワード</Label>
          <Input
            id="password"
            type="password"
            placeholder="8文字以上の安全なパスワード"
            autoComplete="new-password"
            {...register("password")}
          />
          {errors.password && (
            <p className="text-sm text-red-500">{errors.password.message}</p>
          )}
        </div>

        {(serverError || serverSuccess) && (
          <p
            className={serverError ? "text-sm text-red-500" : "text-sm text-green-600"}
          >
            {serverError ?? serverSuccess}
          </p>
        )}

        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? "登録処理中..." : "アカウントを作成"}
        </Button>
      </form>

      <div className="space-y-3">
        <p className="text-center text-xs uppercase tracking-widest text-zinc-500">
          または外部アカウントで登録
        </p>
        <SocialLoginButtons redirectPath="/" />
      </div>
    </div>
  );
}
