import { NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";

import type { Database } from "@/types/supabase";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { getPlanDefinition } from "@/lib/billing/plans";
import { sendWelcomeEmail } from "@/lib/email/notifications";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const schema = z.object({
  email: z.string().email(),
  username: z.string().min(3).max(30),
  password: z
    .string()
    .min(8)
    .regex(/^(?=.*[a-zA-Z])(?=.*\d).+$/, "Password must include letters and numbers"),
});

export async function POST(request: Request) {
  console.log("[signup] リクエスト受信");
  
  const json = await request.json().catch((err) => {
    console.error("[signup] JSON parse error:", err);
    return null;
  });
  
  console.log("[signup] リクエストボディ:", { email: json?.email, username: json?.username });
  
  const parsed = schema.safeParse(json);

  if (!parsed.success) {
    console.error("[signup] バリデーションエラー:", parsed.error.flatten());
    return NextResponse.json(
      { error: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const { email, password, username } = parsed.data;
  const supabase = createServerSupabaseClient();

  console.log("[signup] Supabase認証サインアップ開始");
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { username },
    },
  });

  if (error || !data.user) {
    console.error("[signup] Supabase auth.signUp エラー:", error);
    return NextResponse.json({ error: error?.message ?? "Signup failed" }, { status: 400 });
  }

  console.log("[signup] Supabase認証成功、user_id:", data.user.id);

  const passwordHash = await bcrypt.hash(password, 10);
  const defaultPlan = getPlanDefinition("free");
  const profilePayload: Database["public"]["Tables"]["users"]["Insert"] = {
    id: data.user.id,
    email,
    username,
    password_hash: passwordHash,
    subscription_plan: "free",
    subscription_status: "active",
    api_quota_monthly: defaultPlan.monthlyArticleQuota,
    api_quota_used: 0,
  };

  const adminClient = getSupabaseAdminClient();
  
  if (!adminClient) {
    console.error("[signup] SUPABASE_SERVICE_ROLE_KEY が設定されていません");
    return NextResponse.json(
      { 
        error: "サーバー設定エラー: SUPABASE_SERVICE_ROLE_KEYが設定されていません。管理者に連絡してください。詳細はSETUP_INSTRUCTIONS.mdを参照してください。" 
      },
      { status: 500 },
    );
  }

  console.log("[signup] usersテーブルへINSERT開始 (admin client使用)");
  const { error: profileError } = await adminClient.from("users").insert(profilePayload as never);

  if (profileError) {
    console.error("[signup] usersテーブルINSERTエラー:", {
      code: profileError.code,
      message: profileError.message,
      details: profileError.details,
      hint: profileError.hint,
    });
    return NextResponse.json(
      { error: `データベースエラー: ${profileError.message}` },
      { status: 500 },
    );
  }

  console.log("[signup] usersテーブルINSERT成功");

  try {
    await sendWelcomeEmail({ email, username });
    console.log("[signup] ウェルカムメール送信成功");
  } catch (emailError) {
    console.error("[signup] ウェルカムメール送信失敗:", emailError);
  }

  console.log("[signup] サインアップ完了");
  return NextResponse.json(
    {
      message: "Signup successful. Please check your inbox to verify your email.",
    },
    { status: 201 },
  );
}
