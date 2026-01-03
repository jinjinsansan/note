import puppeteer from "puppeteer";
import type { Page, ElementHandle } from "puppeteer";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";
import { decryptToken } from "@/lib/security";

type AutomationJobInsert = Database["public"]["Tables"]["automation_jobs"]["Insert"];
type AutomationJobRow = Database["public"]["Tables"]["automation_jobs"]["Row"];
type PageWithXpath = Page & { $x: (expression: string) => Promise<ElementHandle<Element>[]> };

type AutomationJobInput = {
  articleId: string;
  noteAccountId: string;
  schedule?: string;
  ctaId?: string | null;
};

type AutomationResult = {
  queued: number;
  jobs: {
    id: string;
    articleId: string;
    status: string;
    scheduledFor: string | null;
    createdAt: string;
  }[];
  notes: string[];
};

const describeWorkflow = () =>
  `Puppeteer workerはautomation_jobsをポーリングし、暗号化されたnoteトークンを復号した後にnote.comのエディタへ投稿します。結果URLは記事レコードにも反映されます。`;

export async function queueNoteAutomationJobs(params: {
  supabase: SupabaseClient<Database>;
  userId: string;
  jobs: AutomationJobInput[];
}): Promise<AutomationResult> {
  const { supabase, jobs, userId } = params;
  if (jobs.length === 0) {
    return { queued: 0, jobs: [], notes: ["No jobs to queue"] };
  }

  const inserts: AutomationJobInsert[] = jobs.map((job) => ({
    user_id: userId,
    article_id: job.articleId,
    note_account_id: job.noteAccountId,
    cta_id: job.ctaId ?? null,
    status: "queued",
    scheduled_for: job.schedule ?? null,
    payload: job.ctaId ? { ctaId: job.ctaId } : null,
  }));

  const { data, error } = await supabase
    .from("automation_jobs")
    .insert(inserts as never)
    .select("id,article_id,status,scheduled_for,created_at")
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  const jobsSummary = ((data ?? []) as AutomationJobRow[]).map((record) => ({
    id: record.id,
    articleId: record.article_id,
    status: record.status,
    scheduledFor: record.scheduled_for,
    createdAt: record.created_at,
  }));

  return {
    queued: jobsSummary.length,
    jobs: jobsSummary,
    notes: [describeWorkflow(), "ジョブはautomation_jobsテーブルに記録されました"],
  };
}

const NOTE_EDITOR_URL = "https://note.com/my/notes/new";
const DEFAULT_USER_AGENT =
  process.env.NOTE_PUBLISHER_USER_AGENT ??
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36";
const DEFAULT_TIMEOUT = Number(process.env.NOTE_PUBLISHER_TIMEOUT_MS ?? 60000);

const candidateSelectors = {
  title: [
    'textarea[data-testid="note-title-input"]',
    'textarea[placeholder="タイトル"]',
    'input[name="note-title"]',
  ],
  editor: [
    '[contenteditable="true"]',
    '[data-testid="note-editor"] div[contenteditable="true"]',
    '.ProseMirror',
  ],
  publishButton: [
    'button[data-testid="note-publish-button"]',
    'button[aria-label="公開"]',
    'button[aria-label="投稿"]',
    'xpath=//button[contains(normalize-space(.),"公開")]',
    'xpath=//button[contains(normalize-space(.),"投稿")]',
  ],
};

const parseCookiePairs = (rawToken: string) =>
  rawToken
    .split(/;\s*/)
    .map((chunk) => chunk.trim())
    .filter(Boolean)
    .map((chunk) => {
      const [name, ...rest] = chunk.split("=");
      return { name, value: rest.join("=") };
    })
    .filter((cookie) => cookie.name && cookie.value);

const typeIntoFirstMatch = async (
  page: Page,
  selectors: string[],
  value: string,
) => {
  for (const selector of selectors) {
    const element = await page.$(selector);
    if (element) {
      await page.focus(selector);
      await page.evaluate((sel) => {
        const node = document.querySelector(sel) as HTMLTextAreaElement | HTMLInputElement | null;
        if (node) node.value = "";
      }, selector);
      await page.type(selector, value, { delay: 5 });
      return true;
    }
  }
  return false;
};

const writeIntoEditor = async (page: Page, selectors: string[], content: string) => {
  for (const selector of selectors) {
    const element = await page.$(selector);
    if (element) {
      await page.focus(selector);
      await page.evaluate(
        (sel, html) => {
          const node = document.querySelector(sel);
          if (node) {
            node.innerHTML = "";
            const paragraphs = html.split(/\n+/).filter(Boolean);
            paragraphs.forEach((para) => {
              const p = document.createElement("p");
              p.textContent = para;
              node.appendChild(p);
            });
          }
        },
        selector,
        content,
      );
      return true;
    }
  }
  return false;
};

export const publishArticleToNote = async (params: {
  authToken: string;
  article: { id: string; title: string; content: string };
}): Promise<{ url: string } | null> => {
  const browser = await puppeteer.launch({
    headless: process.env.NOTE_PUBLISHER_HEADLESS === "false" ? false : "shell",
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  try {
    const page = await browser.newPage();
    await page.setUserAgent(DEFAULT_USER_AGENT);
    const cookies = parseCookiePairs(params.authToken).map((pair) => ({
      name: pair.name,
      value: pair.value,
      domain: ".note.com",
      path: "/",
      httpOnly: true,
      secure: true,
    }));
    if (cookies.length === 0) {
      throw new Error("noteアカウントのセッショントークンが無効です");
    }
    await page.setCookie(...cookies);

    await page.goto(NOTE_EDITOR_URL, { waitUntil: "networkidle2", timeout: DEFAULT_TIMEOUT });

    const typedTitle = await typeIntoFirstMatch(page, candidateSelectors.title, params.article.title);
    if (!typedTitle) {
      throw new Error("noteタイトル入力フィールドを特定できませんでした");
    }

    const wroteContent = await writeIntoEditor(page, candidateSelectors.editor, params.article.content);
    if (!wroteContent) {
      throw new Error("note編集エリアに本文を書き込めませんでした");
    }

    let clickedPublish = false;
    for (const selector of candidateSelectors.publishButton) {
      if (selector.startsWith("xpath=")) {
        const xpath = selector.slice("xpath=".length);
        const [button] = await (page as PageWithXpath).$x(xpath);
        if (button) {
          await button.click();
          clickedPublish = true;
          break;
        }
        continue;
      }

      const button = await page.$(selector);
      if (button) {
        await button.click();
        clickedPublish = true;
        break;
      }
    }

    if (!clickedPublish) {
      throw new Error("noteの公開ボタンを検出できませんでした");
    }

    await page.waitForNavigation({ waitUntil: "networkidle2", timeout: DEFAULT_TIMEOUT });
    const finalUrl = page.url();
    if (!finalUrl.includes("note.com")) {
      throw new Error("noteの投稿URLを取得できませんでした");
    }
    return { url: finalUrl };
  } finally {
    await browser.close();
  }
};

export const decryptNoteToken = (encrypted: string) => decryptToken(encrypted);
