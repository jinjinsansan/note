"use client";

import { useState } from "react";

import type { NoteAccountSummary } from "@/types/note-account";
import { NoteAccountForm } from "@/components/note-accounts/note-account-form";
import { NoteAccountList } from "@/components/note-accounts/note-account-list";

type Props = {
  initialNoteAccounts: NoteAccountSummary[];
};

export function NoteAccountManager({ initialNoteAccounts }: Props) {
  const [noteAccounts, setNoteAccounts] = useState(initialNoteAccounts);

  const handleCreated = (account: NoteAccountSummary) => {
    setNoteAccounts((prev) => [account, ...prev]);
  };

  const handleRemoved = (id: string) => {
    setNoteAccounts((prev) => prev.filter((account) => account.id !== id));
  };

  const handlePrimaryChanged = (account: NoteAccountSummary) => {
    setNoteAccounts((prev) =>
      prev.map((item) => ({
        ...item,
        is_primary: item.id === account.id,
      })),
    );
  };

  return (
    <div className="space-y-8">
      <NoteAccountForm onCreated={handleCreated} />
      <NoteAccountList
        accounts={noteAccounts}
        onRemoved={handleRemoved}
        onPrimaryChanged={handlePrimaryChanged}
      />
    </div>
  );
}
