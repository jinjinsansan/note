"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const schema = z
  .object({
    password: z.string().min(8, "8文字以上のパスワードを入力してください"),
    confirmPassword: z.string().min(8, "確認用パスワードを入力してください"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    path: ["confirmPassword"],
    message: "パスワードが一致しません",
  });

type FormValues = z.infer<typeof schema>;

export function ResetPasswordForm() {
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const router = useRouter();
  const [status, setStatus] = useState<"checking" | "ready" | "missing">("checking");
  const [serverError, setServerError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { password: "", confirmPassword: "" },
  });

  useEffect(() => {
    let mounted = true;
    const initializeSession = async () => {
      const { data } = await supabase.auth.getSession();
      if (data.session) {
        if (mounted) setStatus("ready");
        return;
      }

      if (typeof window !== "undefined" && window.location.hash.includes("access_token")) {
        const { error } = await supabase.auth.getSessionFromUrl({ storeSession: true });
        if (!error && mounted) {
          setStatus("ready");
          router.replace("/reset-password");
          return;
        }
      }

      if (mounted) {
        setStatus("missing");
      }
    };

    initializeSession();

    return () => {
      mounted = false;
    };
  }, [supabase, router]);

  const onSubmit = async (values: FormValues) => {
    setServerError(null);
    setSuccessMessage(null);
    try {
      const { error } = await supabase.auth.updateUser({ password: values.password });
      if (error) {
        throw new Error(error.message);
      }
      setSuccessMessage("パスワードを更新しました。ログイン画面へ移動します。");
      reset();
      setTimeout(() => router.push("/login"), 1500);
    } catch (error) {
      setServerError(
        error instanceof Error ? error.message : "パスワードの更新に失敗しました",
      );
    }
  };

  if (status === "checking") {
    return (
      <div className="p-6">
        <p className="text-sm text-zinc-500">リンクの検証中です...</p>
      </div>
    );
  }

  if (status === "missing") {
    return (
      <div className="space-y-4 p-6 text-sm text-zinc-500">
        <p>このページはメールで届いた再設定リンクからアクセスしてください。</p>
        <p>
          <Link className="text-zinc-900 underline" href="/forgot-password">
            再度リンクを送信する
          </Link>
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="space-y-1">
        <h2 className="text-xl font-semibold text-zinc-900">新しいパスワードを設定</h2>
        <p className="text-sm text-zinc-500">
          セキュリティのため、これまで使用していないパスワードを設定してください。
        </p>
      </div>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor="new-password">新しいパスワード</Label>
          <Input
            id="new-password"
            type="password"
            autoComplete="new-password"
            placeholder="••••••••"
            {...register("password")}
          />
          {errors.password && <p className="text-sm text-red-500">{errors.password.message}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="confirm-password">新しいパスワード（確認）</Label>
          <Input
            id="confirm-password"
            type="password"
            autoComplete="new-password"
            placeholder="••••••••"
            {...register("confirmPassword")}
          />
          {errors.confirmPassword && (
            <p className="text-sm text-red-500">{errors.confirmPassword.message}</p>
          )}
        </div>

        {serverError && <p className="text-sm text-red-500">{serverError}</p>}
        {successMessage && <p className="text-sm text-green-600">{successMessage}</p>}

        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? "更新中..." : "パスワードを更新"}
        </Button>
      </form>
    </div>
  );
}
