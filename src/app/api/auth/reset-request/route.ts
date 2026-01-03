import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { z } from "zod";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";

import type { Database } from "@/types/supabase";

const schema = z.object({
  email: z.string().email("有効なメールアドレスを入力してください"),
});

export async function POST(request: Request) {
  const supabase = createRouteHandlerClient<Database>({ cookies });
  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (!baseUrl) {
    return NextResponse.json(
      { error: "環境変数 NEXT_PUBLIC_APP_URL が設定されていません" },
      { status: 500 },
    );
  }

  const redirectTo = `${baseUrl.replace(/\/$/, "")}/reset-password`;

  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo,
  });

  if (error) {
    return NextResponse.json(
      { error: error.message ?? "リセットメールの送信に失敗しました" },
      { status: 400 },
    );
  }

  return NextResponse.json({ success: true });
}
