import type { StyleProfileSummary } from "@/types/style-profile";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type Props = {
  profiles: StyleProfileSummary[];
};

export function StyleProfileList({ profiles }: Props) {
  if (profiles.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>保存済みスタイル</CardTitle>
          <CardDescription>まだスタイルプロフィールがありません。</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {profiles.map((profile) => (
        <Card key={profile.id} className="px-6 py-4">
          <div className="space-y-1">
            <CardTitle className="text-lg">{profile.profile_name ?? "未命名"}</CardTitle>
            <CardDescription className="text-sm text-zinc-500">
              {profile.tone} / {profile.text_style} / {profile.vocabulary_level}
            </CardDescription>
            {Array.isArray(profile.learning_articles?.sourceUrls) && (
              <p className="text-sm text-zinc-600">
                参考URL: {profile.learning_articles.sourceUrls.length}件
              </p>
            )}
            <p className="text-xs text-zinc-400">
              作成日: {new Date(profile.created_at).toLocaleDateString("ja-JP")}
            </p>
          </div>
        </Card>
      ))}
    </div>
  );
}
