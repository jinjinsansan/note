import type { Metadata } from "next";

import { AuthShell } from "@/components/auth/auth-shell";
import { ResetPasswordForm } from "@/components/auth/reset-password-form";

export const metadata: Metadata = {
  title: "新しいパスワードを設定 | Note Auto Post AI",
};

export default function ResetPasswordPage() {
  return (
    <AuthShell
      title="Note Auto Post AI"
      description="メールのリンクからサインインし、新しいパスワードを設定します"
      footerText="サインインに戻る"
      footerHref="/login"
      footerLinkLabel="ログイン"
    >
      <ResetPasswordForm />
    </AuthShell>
  );
}
