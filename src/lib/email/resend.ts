import { Resend } from "resend";

let cachedResend: Resend | null = null;

export const getResendClient = () => {
  if (cachedResend) {
    return cachedResend;
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return null;
  }

  cachedResend = new Resend(apiKey);
  return cachedResend;
};

export const getDefaultFromAddress = () =>
  process.env.RESEND_FROM_EMAIL ?? "Note Auto Post AI <no-reply@note-auto-post.ai>";
