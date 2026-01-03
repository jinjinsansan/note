import type { Metadata } from "next";
import { SignupForm } from "@/components/auth/signup-form";
import { AuthShell } from "@/components/auth/auth-shell";

export const metadata: Metadata = {
  title: "サインアップ | Note Auto Post AI",
};

export default function SignupPage() {
  return (
    <AuthShell
      title="Note Auto Post AI"
      description="Supabaseアカウントと連携し、note投稿を自動化しましょう。"
      footerText="すでにアカウントをお持ちですか?"
      footerHref="/login"
      footerLinkLabel="ログイン"
    >
      <SignupForm />
    </AuthShell>
  );
}
