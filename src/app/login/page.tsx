import type { Metadata } from "next";
import { LoginForm } from "@/components/auth/login-form";
import { AuthShell } from "@/components/auth/auth-shell";

export const metadata: Metadata = {
  title: "ログイン | Note Auto Post AI",
};

export default function LoginPage() {
  return (
    <AuthShell
      title="Note Auto Post AI"
      description="AI記事生成からnoteへの自動投稿までワークフローを一元管理"
      footerText="まだアカウントをお持ちでない場合"
      footerHref="/signup"
      footerLinkLabel="新規登録"
    >
      <LoginForm />
    </AuthShell>
  );
}
