"use client";

import { useState } from "react";

import type { ArticleDetail, ArticleImage } from "@/types/article";
import type { CtaSummary } from "@/types/cta";
import type { NoteAccountSummary } from "@/types/note-account";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Props = {
  article: ArticleDetail;
  ctas: CtaSummary[];
  images: ArticleImage[];
  noteAccounts: NoteAccountSummary[];
};

const statusOptions = [
  { value: "draft", label: "下書き" },
  { value: "ready", label: "承認待ち" },
  { value: "approved", label: "承認済み" },
  { value: "published", label: "公開済み" },
];

export function ArticleDetailClient({ article, ctas, images: initialImages, noteAccounts }: Props) {
  const [metaDescription, setMetaDescription] = useState(article.meta_description ?? "");
  const [selectedStatus, setSelectedStatus] = useState(article.status ?? "draft");
  const [selectedCta, setSelectedCta] = useState<string | "">(article.cta_id ?? "");
  const [selectedNoteAccount, setSelectedNoteAccount] = useState<string | "">(
    article.note_account_id ?? "",
  );
  const [serverMessage, setServerMessage] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [images, setImages] = useState(initialImages);
  const [imageForm, setImageForm] = useState({
    headingId: "",
    imageUrl: "",
    altText: "",
    imagePrompt: "",
  });
  const [imageMessage, setImageMessage] = useState<string | null>(null);
  const [imageError, setImageError] = useState<string | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  const handleSave = async () => {
    setServerMessage(null);
    setServerError(null);
    setIsSaving(true);
    try {
      const response = await fetch(`/api/articles/${article.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          metaDescription,
          status: selectedStatus,
          ctaId: selectedCta || null,
          noteAccountId: selectedNoteAccount || null,
        }),
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error ?? "保存に失敗しました");
      }
      setServerMessage("保存しました");
    } catch (error) {
      setServerError(error instanceof Error ? error.message : "問題が発生しました");
    } finally {
      setIsSaving(false);
    }
  };

  const handleImageSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setImageMessage(null);
    setImageError(null);
    setIsUploadingImage(true);
    try {
      const response = await fetch(`/api/articles/${article.id}/images`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          headingId: imageForm.headingId || undefined,
          imageUrl: imageForm.imageUrl,
          altText: imageForm.altText,
          imagePrompt: imageForm.imagePrompt || undefined,
        }),
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error ?? "画像情報の保存に失敗しました");
      }
      setImages((prev) => [payload.image as ArticleImage, ...prev]);
      setImageMessage("画像ブロックを保存しました");
      setImageForm({ headingId: "", imageUrl: "", altText: "", imagePrompt: "" });
    } catch (error) {
      setImageError(error instanceof Error ? error.message : "画像保存で問題が発生しました");
    } finally {
      setIsUploadingImage(false);
    }
  };

  const handleImageDelete = async (imageId: string) => {
    setImageError(null);
    try {
      const response = await fetch(`/api/articles/${article.id}/images/${imageId}`, {
        method: "DELETE",
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error ?? "削除に失敗しました");
      }
      setImages((prev) => prev.filter((image) => image.id !== imageId));
    } catch (error) {
      setImageError(error instanceof Error ? error.message : "削除に失敗しました");
    }
  };

  return (
    <div className="space-y-8">
      <Card>
        <CardHeader className="space-y-4">
          <div className="space-y-2">
            <CardTitle>{article.title}</CardTitle>
            <CardDescription>
              カテゴリー: {article.category ?? "未設定"} / 作成日:
              {new Date(article.created_at).toLocaleDateString("ja-JP")}
            </CardDescription>
          </div>
          <article className="rounded-2xl border border-zinc-100 bg-zinc-50 px-6 py-4 text-sm leading-6 text-zinc-800 whitespace-pre-wrap">
            {article.content}
          </article>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader className="space-y-4">
          <div className="space-y-2">
            <CardTitle>メタ情報とCTA</CardTitle>
            <CardDescription>公開前に必要な最終設定を行います。</CardDescription>
          </div>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="meta-desc">メタディスクリプション (最大160文字)</Label>
              <textarea
                id="meta-desc"
                rows={3}
                className="w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm"
                value={metaDescription}
                onChange={(event) => setMetaDescription(event.target.value)}
                maxLength={160}
              />
              <p className="text-xs text-zinc-500">{metaDescription.length} / 160</p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>記事ステータス</Label>
                <select
                  className="h-10 w-full rounded-md border border-zinc-200 bg-white px-3 text-sm"
                  value={selectedStatus}
                  onChange={(event) => setSelectedStatus(event.target.value)}
                >
                  {statusOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label>紐づけるCTA</Label>
                <select
                  className="h-10 w-full rounded-md border border-zinc-200 bg-white px-3 text-sm"
                  value={selectedCta}
                  onChange={(event) => setSelectedCta(event.target.value)}
                >
                  <option value="">CTAなし</option>
                  {ctas.map((cta) => (
                    <option key={cta.id} value={cta.id}>
                      {cta.cta_name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>投稿先noteアカウント</Label>
              <select
                className="h-10 w-full rounded-md border border-zinc-200 bg-white px-3 text-sm"
                value={selectedNoteAccount}
                onChange={(event) => setSelectedNoteAccount(event.target.value)}
              >
                <option value="">未選択（後で指定）</option>
                {noteAccounts.map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.note_username ?? account.note_user_id}
                    {account.is_primary ? "（プライマリ）" : ""}
                  </option>
                ))}
              </select>
              {selectedNoteAccount === "" && noteAccounts.length === 0 && (
                <p className="text-xs text-zinc-500">
                  noteアカウントを登録すると自動投稿の対象に設定できます。
                </p>
              )}
            </div>
            {selectedCta && (
              <div className="rounded-xl border border-zinc-100 bg-zinc-50 px-4 py-3 text-sm text-zinc-700">
                <p className="font-medium text-zinc-900">
                  {ctas.find((cta) => cta.id === selectedCta)?.cta_name}
                </p>
                <p className="text-sm text-zinc-600">
                  {ctas.find((cta) => cta.id === selectedCta)?.cta_content}
                </p>
                <a
                  href={ctas.find((cta) => cta.id === selectedCta)?.cta_link ?? "#"}
                  className="text-xs text-zinc-500 underline"
                  target="_blank"
                  rel="noreferrer"
                >
                  {ctas.find((cta) => cta.id === selectedCta)?.cta_link}
                </a>
              </div>
            )}
            {serverError && <p className="text-sm text-red-500">{serverError}</p>}
            {serverMessage && <p className="text-sm text-green-600">{serverMessage}</p>}
            <Button onClick={handleSave} disabled={isSaving} className="w-full">
              {isSaving ? "保存中..." : "設定を保存"}
            </Button>
          </div>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader className="space-y-4">
          <div className="space-y-2">
            <CardTitle>画像セクション</CardTitle>
            <CardDescription>各見出しに対応する画像URLとALTテキストを管理します。</CardDescription>
          </div>
          <form onSubmit={handleImageSubmit} className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label htmlFor="image-heading">見出しID (任意)</Label>
                <Input
                  id="image-heading"
                  value={imageForm.headingId}
                  onChange={(event) =>
                    setImageForm((prev) => ({ ...prev, headingId: event.target.value }))
                  }
                  placeholder="section-1"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="image-url">画像URL</Label>
                <Input
                  id="image-url"
                  value={imageForm.imageUrl}
                  onChange={(event) =>
                    setImageForm((prev) => ({ ...prev, imageUrl: event.target.value }))
                  }
                  placeholder="https://"
                  required
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label htmlFor="image-alt">ALTテキスト</Label>
              <Input
                id="image-alt"
                value={imageForm.altText}
                onChange={(event) =>
                  setImageForm((prev) => ({ ...prev, altText: event.target.value }))
                }
                required
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="image-prompt">生成プロンプト/備考 (任意)</Label>
              <textarea
                id="image-prompt"
                rows={2}
                className="w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm"
                value={imageForm.imagePrompt}
                onChange={(event) =>
                  setImageForm((prev) => ({ ...prev, imagePrompt: event.target.value }))
                }
              />
            </div>
            {imageError && <p className="text-sm text-red-500">{imageError}</p>}
            {imageMessage && <p className="text-sm text-green-600">{imageMessage}</p>}
            <Button type="submit" disabled={isUploadingImage} className="w-full">
              {isUploadingImage ? "保存中..." : "画像情報を追加"}
            </Button>
          </form>
          <div className="space-y-3 pt-4">
            {images.length === 0 && (
              <p className="text-sm text-zinc-500">まだ画像は登録されていません。</p>
            )}
            {images.map((image) => (
              <div
                key={image.id}
                className="rounded-2xl border border-zinc-100 bg-white px-4 py-3 text-sm text-zinc-700"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-zinc-900">{image.heading_id ?? "共通"}</p>
                    <p className="text-xs text-zinc-500">
                      {new Date(image.created_at).toLocaleString("ja-JP")}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleImageDelete(image.id)}
                  >
                    削除
                  </Button>
                </div>
                <p className="text-sm text-zinc-600">ALT: {image.alt_text}</p>
                <a
                  href={image.image_url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-zinc-500 underline"
                >
                  {image.image_url}
                </a>
                {image.image_prompt && (
                  <p className="text-xs text-zinc-500">Prompt: {image.image_prompt}</p>
                )}
              </div>
            ))}
          </div>
        </CardHeader>
      </Card>
    </div>
  );
}
