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
  const json = await request.json().catch(() => null);
  const parsed = schema.safeParse(json);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const { email, password, username } = parsed.data;
  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { username },
    },
  });

  if (error || !data.user) {
    return NextResponse.json({ error: error?.message ?? "Signup failed" }, { status: 400 });
  }

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
    console.error("[signup] SUPABASE_SERVICE_ROLE_KEY not configured");
    return NextResponse.json(
      { 
        error: "サーバー設定エラー: 管理者に連絡してください。" 
      },
      { status: 500 },
    );
  }

  const { error: profileError } = await adminClient.from("users").insert(profilePayload as never);

  if (profileError) {
    console.error("[signup] Database insert error:", profileError.message);
    return NextResponse.json(
      { error: `データベースエラー: ${profileError.message}` },
      { status: 500 },
    );
  }

  try {
    await sendWelcomeEmail({ email, username });
  } catch (emailError) {
    console.error("[signup] Welcome email failed:", emailError);
  }

  return NextResponse.json(
    {
      message: "Signup successful. Please check your inbox to verify your email.",
    },
    { status: 201 },
  );
}
