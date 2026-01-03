import type { CtaSummary } from "@/types/cta";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useState } from "react";

type Props = {
  ctas: CtaSummary[];
  onRemoved: (id: string) => void;
};

export function CtaList({ ctas, onRemoved }: Props) {
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      const response = await fetch(`/api/ctas/${id}`, { method: "DELETE" });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error ?? "削除に失敗しました");
      }
      onRemoved(id);
    } catch {
      alert("CTAの削除に失敗しました");
    } finally {
      setDeletingId(null);
    }
  };

  if (ctas.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>保存済みCTA</CardTitle>
          <CardDescription>まだCTAが登録されていません。</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {ctas.map((cta) => (
        <Card key={cta.id} className="px-6 py-4">
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between gap-4">
              <CardTitle className="text-lg">{cta.cta_name}</CardTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleDelete(cta.id)}
                disabled={deletingId === cta.id}
              >
                {deletingId === cta.id ? "削除中" : "削除"}
              </Button>
            </div>
            <CardDescription className="text-sm text-zinc-600 whitespace-pre-line">
              {cta.cta_content}
            </CardDescription>
            <a
              href={cta.cta_link ?? "#"}
              target="_blank"
              rel="noreferrer"
              className="text-sm font-medium text-zinc-900 underline"
            >
              {cta.cta_link}
            </a>
            <p className="text-xs text-zinc-400">
              作成日: {new Date(cta.created_at).toLocaleDateString("ja-JP")}
            </p>
          </div>
        </Card>
      ))}
    </div>
  );
}
