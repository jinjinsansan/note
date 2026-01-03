import { NextResponse } from "next/server";
import { z } from "zod";
import puppeteer, { type Page, type ElementHandle } from "puppeteer";

import { encryptToken } from "@/lib/security";
import { logApiUsage } from "@/lib/api-logger";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { Database } from "@/types/supabase";

type NoteAccountRow = Pick<
  Database["public"]["Tables"]["note_accounts"]["Row"],
  "id" | "note_user_id" | "is_primary"
>;

export const runtime = "nodejs";

const schema = z.object({
  email: z.string().email("有効なメールアドレスを入力してください"),
  password: z.string().min(6, "パスワードを入力してください"),
});

const LOGIN_URL = "https://note.com/login";
const PROFILE_ENDPOINT = "https://note.com/api/v2/profile";
const DEFAULT_TIMEOUT = Number(process.env.NOTE_PUBLISHER_TIMEOUT_MS ?? 60000);
const USER_AGENT =
  process.env.NOTE_PUBLISHER_USER_AGENT ??
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36";

const titleSelectors = ["input[type=email]", "input[name=email]"];
const passwordSelectors = ["input[type=password]", "input[name=password]"];
const submitSelectors = [
  'button[type="submit"]',
  'button[data-testid="login-submit"]',
  'xpath=//button[contains(normalize-space(.),"ログイン")]',
];

const focusAndType = async (page: Page, selectors: string[], value: string) => {
  for (const selector of selectors) {
    const element = await page.$(selector);
    if (element) {
      await page.focus(selector);
      await page.click(selector, { clickCount: 3 });
      await page.type(selector, value, { delay: 20 });
      return true;
    }
  }
  return false;
};

type PageWithXpath = Page & {
  $x: (expression: string) => Promise<ElementHandle<Element>[]>;
};

const clickFirst = async (page: Page, selectors: string[]) => {
  for (const selector of selectors) {
    if (selector.startsWith("xpath=")) {
      const xpath = selector.slice("xpath=".length);
      const [element] = await (page as PageWithXpath).$x(xpath);
      if (element) {
        await element.click();
        return true;
      }
      continue;
    }

    const element = await page.$(selector);
    if (element) {
      await element.click();
      return true;
    }
  }
  return false;
};

const gatherCookies = async (page: Page) => {
  const cookies = await page.cookies();
  const relevant = cookies.filter((cookie) => cookie.domain?.endsWith("note.com"));
  if (!relevant.length) {
    throw new Error("note.comのセッションクッキーを取得できませんでした");
  }
  return relevant.map((cookie) => `${cookie.name}=${cookie.value}`).join("; ");
};

const fetchProfile = async (page: Page) => {
  try {
    const response = await page.evaluate(async (endpoint) => {
      const res = await fetch(endpoint, { credentials: "include" });
      if (!res.ok) return null;
      return res.json();
    }, PROFILE_ENDPOINT);
    return response?.data?.user ?? null;
  } catch (error) {
    console.error("note_profile_fetch_failed", error);
    return null;
  }
};

export async function POST(request: Request) {
  const supabase = await createServerSupabaseClient();
  const startedAt = Date.now();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;
  const json = await request.json().catch(() => null);
  const parsed = schema.safeParse(json);
  if (!parsed.success) {
    await logApiUsage({
      supabase,
      userId,
      endpoint: "/api/note-accounts/authenticate",
      method: "POST",
      statusCode: 400,
      startedAt,
      errorMessage: "validation_error",
    });
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const browser = await puppeteer.launch({
    headless: process.env.NOTE_PUBLISHER_HEADLESS === "false" ? false : "shell",
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  try {
    const page = await browser.newPage();
    await page.setUserAgent(USER_AGENT);
    await page.goto(LOGIN_URL, { waitUntil: "networkidle2", timeout: DEFAULT_TIMEOUT });

    const typedEmail = await focusAndType(page, titleSelectors, parsed.data.email);
    const typedPassword = await focusAndType(page, passwordSelectors, parsed.data.password);
    if (!typedEmail || !typedPassword) {
      throw new Error("noteログインフォームを特定できませんでした");
    }

    const clickedSubmit = await clickFirst(page, submitSelectors);
    if (!clickedSubmit) {
      throw new Error("ログインボタンをクリックできませんでした");
    }

    await page.waitForNavigation({ waitUntil: "networkidle2", timeout: DEFAULT_TIMEOUT });
    if (page.url().includes("/login")) {
      throw new Error("ログインに失敗しました。メールアドレス/パスワードをご確認ください。");
    }

    const rawToken = await gatherCookies(page);
    const profile = await fetchProfile(page);
    if (!profile?.urlname) {
      throw new Error("noteアカウント情報を取得できませんでした");
    }

    const encryptedToken = encryptToken(rawToken);
    const selectFields =
      "id,note_user_id,note_username,is_primary,created_at,last_synced_at" as const;

    const { data: existingAccounts } = await supabase
      .from("note_accounts")
      .select("id,is_primary,note_user_id")
      .eq("user_id", userId);

    const noteAccounts = (existingAccounts ?? []) as NoteAccountRow[];
    const existing = noteAccounts.find((account) => account.note_user_id === profile.urlname);
    const shouldSetPrimary = noteAccounts.length ? undefined : true;

    const upsertPayload: Database["public"]["Tables"]["note_accounts"]["Insert"] = {
      user_id: userId,
      note_user_id: profile.urlname,
      note_username: profile.nickname ?? profile.name ?? profile.urlname,
      auth_token: encryptedToken,
      is_primary: existing?.is_primary ?? shouldSetPrimary ?? false,
    };

    if (existing) {
      const updatePayload: Database["public"]["Tables"]["note_accounts"]["Update"] = {
        auth_token: encryptedToken,
        note_username: upsertPayload.note_username,
      };
      const { data, error } = await supabase
        .from("note_accounts")
        .update(updatePayload as never)
        .eq("user_id", userId)
        .eq("id", existing.id)
        .select(selectFields)
        .single();

      if (error) {
        throw new Error(error.message);
      }

      await logApiUsage({
        supabase,
        userId,
        endpoint: "/api/note-accounts/authenticate",
        method: "POST",
        statusCode: 200,
        startedAt,
      });

      return NextResponse.json({ noteAccount: data });
    }

    const { data, error } = await supabase
      .from("note_accounts")
      .insert(upsertPayload as never)
      .select(selectFields)
      .single();

    if (error) {
      throw new Error(error.message);
    }

    await logApiUsage({
      supabase,
      userId,
      endpoint: "/api/note-accounts/authenticate",
      method: "POST",
      statusCode: 201,
      startedAt,
    });

    return NextResponse.json({ noteAccount: data }, { status: 201 });
  } catch (error) {
    console.error("note_authenticate_failed", error);
    await logApiUsage({
      supabase,
      userId,
      endpoint: "/api/note-accounts/authenticate",
      method: "POST",
      statusCode: 502,
      startedAt,
      errorMessage: error instanceof Error ? error.message : "automation_error",
    });
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "noteアカウントの認証に失敗しました。時間を空けて再試行してください。",
      },
      { status: 502 },
    );
  } finally {
    await browser.close();
  }
}
