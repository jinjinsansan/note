import type { Metadata } from "next";

import { AuthShell } from "@/components/auth/auth-shell";
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";

export const metadata: Metadata = {
  title: "パスワードリセット | Note Auto Post AI",
};

export default function ForgotPasswordPage() {
  return (
    <AuthShell
      title="Note Auto Post AI"
      description="登録済みメールアドレスで再設定リンクを受け取れます"
      footerText="サインインに戻る"
      footerHref="/login"
      footerLinkLabel="ログイン"
    >
      <ForgotPasswordForm />
    </AuthShell>
  );
}
