import Link from "next/link";

import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type ArticlePreview = {
  id: string;
  title: string;
  category: string | null;
  status: string;
  word_count: number | null;
  meta_description: string | null;
  created_at: string;
  updated_at: string;
};

type Props = {
  articles: ArticlePreview[];
};

export function ArticleList({ articles }: Props) {
  if (articles.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>生成済み記事</CardTitle>
          <CardDescription>まだ下書きはありません。AIで作成してみましょう。</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {articles.map((article) => (
        <Card key={article.id} className="px-6 py-4">
          <div className="flex flex-col gap-2">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <CardTitle className="text-lg">{article.title}</CardTitle>
              <div className="flex items-center gap-3">
                <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-medium uppercase text-zinc-700">
                  {article.status}
                </span>
                <Link
                  href={`/articles/${article.id}`}
                  className="text-xs font-medium text-zinc-900 underline"
                >
                  詳細を見る
                </Link>
              </div>
            </div>
            <CardDescription className="text-sm text-zinc-500">
              {article.category ?? "未設定"} ・ 約{article.word_count ?? 0}語 ・
              {new Date(article.created_at).toLocaleDateString("ja-JP")}
            </CardDescription>
            {article.meta_description && (
              <p className="text-sm text-zinc-600">{article.meta_description}</p>
            )}
          </div>
        </Card>
      ))}
    </div>
  );
}
