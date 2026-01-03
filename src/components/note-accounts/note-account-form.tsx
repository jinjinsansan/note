"use client";

import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

import type { NoteAccountSummary } from "@/types/note-account";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const manualSchema = z.object({
  noteUserId: z.string().min(1, "noteユーザーIDを入力してください"),
  noteUsername: z.string().min(1, "noteユーザー名を入力してください"),
  authToken: z.string().min(10, "有効な認証トークンを入力してください"),
  isPrimary: z.boolean().optional(),
});

type ManualFormValues = z.infer<typeof manualSchema>;

type AuthResponse = {
  noteAccount?: NoteAccountSummary;
  error?: unknown;
};

type Props = {
  onCreated: (account: NoteAccountSummary) => void;
};

export function NoteAccountForm({ onCreated }: Props) {
  const [serverError, setServerError] = useState<string | null>(null);
  const [mode, setMode] = useState<"manual" | "auto">("manual");
  const [autoEmail, setAutoEmail] = useState("");
  const [autoPassword, setAutoPassword] = useState("");
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ManualFormValues>({
    resolver: zodResolver(manualSchema),
    defaultValues: {
      noteUserId: "",
      noteUsername: "",
      authToken: "",
      isPrimary: false,
    },
  });

  const modeToggleClass = useMemo(
    () =>
      "flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition focus-visible:outline-none",
    [],
  );

  const onSubmit = async (values: ManualFormValues) => {
    setServerError(null);
    try {
      const response = await fetch("/api/note-accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const payload = (await response.json()) as {
        noteAccount?: NoteAccountSummary;
        error?: unknown;
      };

      if (!response.ok || !payload.noteAccount) {
        throw new Error(
          typeof payload.error === "string"
            ? payload.error
            : "noteアカウントの登録に失敗しました",
        );
      }

      onCreated(payload.noteAccount);
      reset({ noteUserId: "", noteUsername: "", authToken: "", isPrimary: false });
    } catch (error) {
      setServerError(
        error instanceof Error
          ? error.message
          : "問題が発生しました。時間をおいて再度お試しください。",
      );
    }
  };

  const handleAuthenticate = async () => {
    setServerError(null);
    setIsAuthenticating(true);
    try {
      const response = await fetch("/api/note-accounts/authenticate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: autoEmail, password: autoPassword }),
      });
      const payload = (await response.json()) as AuthResponse;
      if (!response.ok || !payload.noteAccount) {
        throw new Error(
          typeof payload.error === "string"
            ? payload.error
            : "noteアカウントの認証に失敗しました",
        );
      }
      setAutoEmail("");
      setAutoPassword("");
      onCreated(payload.noteAccount);
    } catch (error) {
      setServerError(
        error instanceof Error
          ? error.message
          : "noteアカウントの認証に失敗しました。時間をおいて再実行してください。",
      );
    } finally {
      setIsAuthenticating(false);
    }
  };

  return (
    <Card>
      <CardHeader className="mb-0 space-y-4">
        <div className="space-y-2">
          <CardTitle>noteアカウントの連携</CardTitle>
          <CardDescription>
            noteのログイン情報から自動取得、または既存のセッショントークンを登録できます。
          </CardDescription>
        </div>
        <div className="rounded-lg border border-zinc-100 bg-zinc-50 p-1 text-sm">
          <div className="flex gap-1">
            {[
              { value: "auto", label: "ログイン情報から取得" },
              { value: "manual", label: "トークンを直接入力" },
            ].map((option) => (
              <button
                key={option.value}
                type="button"
                className={`${modeToggleClass} ${
                  mode === option.value
                    ? "border-zinc-900 bg-white text-zinc-900"
                    : "border-transparent text-zinc-500"
                }`}
                onClick={() => setMode(option.value as typeof mode)}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
        {mode === "manual" ? (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="noteUserId">noteユーザーID</Label>
                <Input id="noteUserId" placeholder="example" {...register("noteUserId")} />
                {errors.noteUserId && (
                  <p className="text-sm text-red-500">{errors.noteUserId.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="noteUsername">noteユーザー名</Label>
                <Input id="noteUsername" placeholder="note公式名" {...register("noteUsername")} />
                {errors.noteUsername && (
                  <p className="text-sm text-red-500">{errors.noteUsername.message}</p>
                )}
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="authToken">セッショントークン</Label>
              <Input
                id="authToken"
                placeholder="example_cookie_session"
                {...register("authToken")}
              />
              {errors.authToken && (
                <p className="text-sm text-red-500">{errors.authToken.message}</p>
              )}
            </div>
            <label className="flex items-center gap-2 text-sm text-zinc-600">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-zinc-300 text-zinc-900 focus:ring-black"
                {...register("isPrimary")}
              />
              このアカウントをデフォルトに設定する
            </label>
            {serverError && <p className="text-sm text-red-500">{serverError}</p>}
            <Button type="submit" disabled={isSubmitting} className="w-full">
              {isSubmitting ? "登録中..." : "アカウントを登録"}
            </Button>
          </form>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="noteEmail">noteメールアドレス</Label>
              <Input
                id="noteEmail"
                type="email"
                placeholder="you@example.com"
                value={autoEmail}
                onChange={(event) => setAutoEmail(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="notePassword">noteパスワード</Label>
              <Input
                id="notePassword"
                type="password"
                placeholder="********"
                value={autoPassword}
                onChange={(event) => setAutoPassword(event.target.value)}
              />
              <p className="text-xs text-zinc-500">
                入力情報はログイン処理後に破棄され、保存されません。2段階認証を利用している場合は手動登録をご利用ください。
              </p>
            </div>
            {serverError && <p className="text-sm text-red-500">{serverError}</p>}
            <Button
              type="button"
              className="w-full"
              disabled={isAuthenticating || !autoEmail || !autoPassword}
              onClick={handleAuthenticate}
            >
              {isAuthenticating ? "連携中..." : "noteにログインして連携"}
            </Button>
          </div>
        )}
      </CardHeader>
    </Card>
  );
}
