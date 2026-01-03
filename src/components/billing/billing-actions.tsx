"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";

type Props = {
  plan: string;
  status?: string | null;
};

const fetchSessionUrl = async (endpoint: string) => {
  const response = await fetch(endpoint, { method: "POST" });
  const payload = await response.json();
  if (!response.ok || !payload.url) {
    throw new Error(payload.error ?? "セッションURLの取得に失敗しました");
  }
  return payload.url as string;
};

export function BillingActions({ plan, status }: Props) {
  const [isLoadingCheckout, setIsLoadingCheckout] = useState(false);
  const [isLoadingPortal, setIsLoadingPortal] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCheckout = async () => {
    setError(null);
    setIsLoadingCheckout(true);
    try {
      const url = await fetchSessionUrl("/api/billing/checkout");
      window.location.href = url;
    } catch (err) {
      setError(err instanceof Error ? err.message : "チェックアウト開始に失敗しました");
    } finally {
      setIsLoadingCheckout(false);
    }
  };

  const handlePortal = async () => {
    setError(null);
    setIsLoadingPortal(true);
    try {
      const url = await fetchSessionUrl("/api/billing/portal");
      window.location.href = url;
    } catch (err) {
      setError(err instanceof Error ? err.message : "請求ポータルの取得に失敗しました");
    } finally {
      setIsLoadingPortal(false);
    }
  };

  return (
    <div className="space-y-3">
      {plan === "pro" ? (
        <div className="space-y-2">
          <Button
            className="w-full"
            variant="outline"
            onClick={handlePortal}
            disabled={isLoadingPortal}
          >
            {isLoadingPortal ? "読み込み中..." : "請求情報を管理"}
          </Button>
          <p className="text-xs text-zinc-500">現在のステータス: {status ?? "不明"}</p>
        </div>
      ) : (
        <Button className="w-full" onClick={handleCheckout} disabled={isLoadingCheckout}>
          {isLoadingCheckout ? "リダイレクト中..." : "Proプランにアップグレード"}
        </Button>
      )}
      {error && <p className="text-sm text-red-500">{error}</p>}
    </div>
  );
}
