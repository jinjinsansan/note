import { load } from "cheerio";

const NOTE_HOSTS = ["note.com", "note.jp", "note.mu"];

const ARTICLE_SELECTORS = [
  ".o-noteContent",
  ".o-noteBody",
  "article",
  ".p-rich_text",
  "[data-contents-blocks]",
];

const normalizeText = (text: string) =>
  text
    .replace(/\u00A0/g, " ")
    .replace(/\r/g, "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .join("\n\n");

const hostnameAllowed = (hostname: string) =>
  NOTE_HOSTS.some((host) => hostname === host || hostname.endsWith(`.${host}`));

export type NoteArticle = {
  title: string;
  content: string;
  wordCount: number;
  url: string;
};

export async function fetchNoteArticle(rawUrl: string): Promise<NoteArticle> {
  const parsedUrl = new URL(rawUrl);
  if (!hostnameAllowed(parsedUrl.hostname)) {
    throw new Error("noteの記事URLのみ対応しています");
  }

  const response = await fetch(parsedUrl.toString(), {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (compatible; note-auto-fetcher/1.0; +https://note.auto)",
    },
  });

  if (!response.ok) {
    throw new Error("記事の取得に失敗しました");
  }

  const html = await response.text();
  const $ = load(html);

  const title = normalizeText($("h1").first().text()) || normalizeText($("title").text());

  let content = "";
  for (const selector of ARTICLE_SELECTORS) {
    const nodes = $(selector);
    if (nodes.length) {
      content = nodes
        .map((_, element) => normalizeText($(element).text()))
        .get()
        .filter(Boolean)
        .join("\n\n");
      if (content.length > 200) {
        break;
      }
    }
  }

  if (!content) {
    content = $("p")
      .map((_, element) => normalizeText($(element).text()))
      .get()
      .filter(Boolean)
      .join("\n\n");
  }

  if (!content) {
    throw new Error("本文を抽出できませんでした");
  }

  const trimmedContent = content.slice(0, 15000);
  const wordCount = trimmedContent.split(/\s+/).filter(Boolean).length;

  return {
    title: title || "note記事",
    content: trimmedContent,
    wordCount,
    url: parsedUrl.toString(),
  };
}
