"use client";

import { useState } from "react";
import Link from "next/link";
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
  password: z.string().min(8, "パスワードを入力してください"),
});

type LoginValues = z.infer<typeof schema>;

export function LoginForm() {
  const [serverError, setServerError] = useState<string | null>(null);
  const router = useRouter();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: "", password: "" },
  });

  const onSubmit = async (values: LoginValues) => {
    setServerError(null);
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(
          typeof payload.error === "string"
            ? payload.error
            : "ログインに失敗しました。",
        );
      }
      router.push("/");
      router.refresh();
    } catch (error) {
      console.error(error);
      setServerError(
        error instanceof Error
          ? error.message
          : "ログインに失敗しました。もう一度お試しください。",
      );
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h2 className="text-xl font-semibold text-zinc-900">ログイン</h2>
        <p className="text-sm text-zinc-500">
          登録済みのメールアドレスとパスワードでサインインしてください。
        </p>
      </div>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor="login-email">メールアドレス</Label>
          <Input
            id="login-email"
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
          <Label htmlFor="login-password">パスワード</Label>
          <Input
            id="login-password"
            type="password"
            placeholder="パスワード"
            autoComplete="current-password"
            {...register("password")}
          />
          {errors.password && (
            <p className="text-sm text-red-500">{errors.password.message}</p>
          )}
        </div>

        <div className="flex items-center justify-between text-sm">
          <div />
          <Link className="text-zinc-900 underline-offset-2 hover:underline" href="/forgot-password">
            パスワードをお忘れですか？
          </Link>
        </div>

        {serverError && <p className="text-sm text-red-500">{serverError}</p>}

        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? "ログイン中..." : "ログイン"}
        </Button>
      </form>

      <div className="space-y-3">
        <p className="text-center text-xs uppercase tracking-widest text-zinc-500">
          またはソーシャルアカウントで続行
        </p>
        <SocialLoginButtons redirectPath="/" />
      </div>
    </div>
  );
}
