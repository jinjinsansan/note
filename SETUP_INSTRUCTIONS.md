# セットアップ手順

## 重要：Supabase Service Role Keyの設定

サインアップ機能を有効にするには、Supabase Service Role Keyを`.env.local`に追加する必要があります。

### 手順

1. [Supabase Dashboard](https://supabase.com/dashboard)にログイン
2. プロジェクト「Note Auto Post AI」を選択
3. 左サイドバーから「Settings」→「API」を選択
4. 「Project API keys」セクションで「service_role」キーを見つけます
5. 「Reveal」ボタンをクリックしてキーを表示
6. キーをコピー

### `.env.local`に追加

`.env.local`ファイルに以下の行を追加してください：

```bash
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9... # ここに実際のキーを貼り付け
```

### なぜこれが必要か？

- サインアップ時に`users`テーブルにレコードを作成するには、管理者権限が必要です
- Service Role Keyを使用することで、Row Level Security (RLS)ポリシーをバイパスして安全にユーザーレコードを作成できます
- これは標準的なSupabaseのベストプラクティスです

### セキュリティ注意事項

⚠️ **重要**: Service Role Keyは絶対に公開しないでください
- `.env.local`ファイルは`.gitignore`に含まれています
- フロントエンドコードでは決して使用しないでください
- サーバーサイド（APIルート）でのみ使用してください

## 設定後

Service Role Keyを追加したら、開発サーバーを再起動してください：

```bash
npm run dev
```

これでサインアップ機能が正常に動作するはずです。
