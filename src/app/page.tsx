import Link from "next/link";

export default function Home() {
  return (
    <section className="space-y-8 rounded-3xl bg-white p-10 shadow-sm">
      <div className="space-y-4">
        <p className="text-sm font-medium uppercase tracking-widest text-zinc-500">
          AIコンテンツ自動化
        </p>
        <h1 className="text-4xl font-semibold leading-tight text-zinc-900">
          noteの記事生成から投稿までを<br />
          ワンストップで自動化
        </h1>
        <p className="text-lg text-zinc-600">
          自分の文体を学習したAIがCTAやSEO対策まで反映した記事を生成。
          Supabaseと連携して、認証からワークフロー管理までシームレスに行えます。
        </p>
      </div>
      <div className="flex flex-wrap gap-4">
        <Link href="/signup">
          <span className="inline-flex h-12 items-center justify-center rounded-full bg-zinc-900 px-6 text-sm font-semibold text-white transition hover:bg-zinc-800">
            無料で始める
          </span>
        </Link>
        <Link href="/login">
          <span className="inline-flex h-12 items-center justify-center rounded-full border border-zinc-200 px-6 text-sm font-semibold text-zinc-900 hover:bg-zinc-50">
            既存ユーザーはこちら
          </span>
        </Link>
      </div>
    </section>
  );
}
