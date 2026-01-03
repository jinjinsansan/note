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
  const supabase = createServerSupabaseClient();

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
  const dbClient = adminClient ?? supabase;

  const { error: profileError } = await dbClient.from("users").insert(profilePayload as never);

  if (profileError) {
    return NextResponse.json(
      { error: profileError.message },
      { status: 500 },
    );
  }

  try {
    await sendWelcomeEmail({ email, username });
  } catch (emailError) {
    console.error("Failed to send welcome email", emailError);
  }

  return NextResponse.json(
    {
      message: "Signup successful. Please check your inbox to verify your email.",
    },
    { status: 201 },
  );
}
