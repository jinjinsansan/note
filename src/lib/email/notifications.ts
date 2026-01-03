import { getDefaultFromAddress, getResendClient } from "./resend";

const escapeHtml = (value: string) =>
  value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const getBaseAppUrl = () => process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
const getDashboardUrl = () => `${getBaseAppUrl()}/articles`;
const getBillingUrl = () => `${getBaseAppUrl()}/billing`;

export const sendWelcomeEmail = async (params: { email: string; username?: string | null }) => {
  const resend = getResendClient();
  const from = getDefaultFromAddress();

  if (!resend || !from) {
    return;
  }

  const subject = "Note Auto Post AI へようこそ";
  const userName = params.username ? escapeHtml(params.username) : "クリエイター";
  const html = `
    <div style="font-family: 'Helvetica Neue', Arial, sans-serif; color: #18181B;">
      <h1>ようこそ、${userName}さん</h1>
      <p>Note Auto Post AIをご利用いただきありがとうございます。</p>
      <p>以下のリンクからダッシュボードにアクセスして、記事生成やnote投稿の自動化を始めましょう。</p>
      <p>
        <a href="${getDashboardUrl()}" style="display:inline-block;padding:10px 20px;background:#18181B;color:#fff;border-radius:8px;text-decoration:none;">
          ダッシュボードを開く
        </a>
      </p>
      <p style="font-size:12px;color:#71717A;">このメールに心当たりがない場合は破棄してください。</p>
    </div>
  `;

  try {
    await resend.emails.send({
      from,
      to: params.email,
      subject,
      html,
    });
  } catch (error) {
    console.error("Failed to send welcome email", error);
  }
};

export const sendPaymentFailureEmail = async (params: {
  email: string;
  planLabel: string;
  nextAction?: string;
}) => {
  const resend = getResendClient();
  const from = getDefaultFromAddress();

  if (!resend || !from) {
    return;
  }

  const subject = "決済に失敗しました - お支払い方法をご確認ください";
  const html = `
    <div style="font-family: 'Helvetica Neue', Arial, sans-serif; color: #18181B;">
      <p>いつもNote Auto Post AIをご利用いただきありがとうございます。</p>
      <p>${params.planLabel}の更新に失敗したため、サービスが一時的に制限されています。</p>
      <p>お支払い方法をご確認のうえ、以下のリンクから請求情報を更新してください。</p>
      <p>
        <a href="${getBillingUrl()}" style="display:inline-block;padding:10px 20px;background:#18181B;color:#fff;border-radius:8px;text-decoration:none;">
          請求情報を確認する
        </a>
      </p>
      ${params.nextAction ? `<p style="color:#b91c1c;font-weight:500;">${escapeHtml(params.nextAction)}</p>` : ""}
      <p style="font-size:12px;color:#71717A;">すでにお手続きを済まされている場合は、このメールは破棄してください。</p>
    </div>
  `;

  try {
    await resend.emails.send({
      from,
      to: params.email,
      subject,
      html,
    });
  } catch (error) {
    console.error("Failed to send payment failure email", error);
  }
};
