"use client";

import { useState } from "react";
import type { NoteAccountSummary } from "@/types/note-account";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type Props = {
  accounts: NoteAccountSummary[];
  onRemoved: (id: string) => void;
  onPrimaryChanged: (account: NoteAccountSummary) => void;
};

export function NoteAccountList({ accounts, onRemoved, onPrimaryChanged }: Props) {
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [primaryId, setPrimaryId] = useState<string | null>(null);

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      const response = await fetch(`/api/note-accounts/${id}`, { method: "DELETE" });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error ?? "削除に失敗しました");
      }
      onRemoved(id);
    } catch (error) {
      console.error(error);
      alert("削除時に問題が発生しました");
    } finally {
      setDeletingId(null);
    }
  };

  const handleSetPrimary = async (account: NoteAccountSummary) => {
    setPrimaryId(account.id);
    try {
      const response = await fetch(`/api/note-accounts/${account.id}/primary`, { method: "POST" });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error ?? "プライマリ設定に失敗しました");
      }
      onPrimaryChanged(payload.noteAccount as NoteAccountSummary);
    } catch (error) {
      console.error(error);
      alert("プライマリ設定で問題が発生しました");
    } finally {
      setPrimaryId(null);
    }
  };

  if (accounts.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>登録済みアカウント</CardTitle>
          <CardDescription>まだアカウントが登録されていません。</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="grid gap-4">
      {accounts.map((account) => (
        <Card key={account.id} className="flex flex-col gap-3 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="text-lg">{account.note_username}</CardTitle>
            <CardDescription className="text-sm text-zinc-500">
              ID: {account.note_user_id}
              {account.is_primary && <span className="ml-2 text-zinc-900">(プライマリ)</span>}
            </CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleSetPrimary(account)}
              disabled={account.is_primary || primaryId === account.id}
            >
              {account.is_primary ? "既定" : primaryId === account.id ? "更新中" : "既定に設定"}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleDelete(account.id)}
              disabled={deletingId === account.id}
            >
              {deletingId === account.id ? "削除中" : "削除"}
            </Button>
          </div>
        </Card>
      ))}
    </div>
  );
}
