import type { ResponseCreateParamsNonStreaming } from "openai/resources/responses";
import type { Database } from "@/types/supabase";

import { getOpenAIClient, getResponsesModel } from "./openai";
import { extractResponseText, safeJSONParse } from "./utils";

export type StyleProfileContext = {
  profileName?: string | null;
  tone?: string | null;
  textStyle?: string | null;
  vocabularyLevel?: string | null;
  notes?: string | null;
  summary?: string | null;
};

export type CTAContext = {
  name: string;
  content: string;
  link?: string | null;
};

export type ArticleDraftSection = {
  heading: string;
  summary: string;
  body: string;
  bulletPoints: string[];
  keywords: string[];
  imagePrompt: string;
};

export type ArticleDraft = {
  introduction: string;
  sections: ArticleDraftSection[];
  conclusion: string;
  metaDescription: string;
  heroImagePrompt: string;
  callToActionPlacement: "intro" | "mid" | "end";
  suggestedSlug: string;
};

const draftSchema = {
  name: "article_draft",
  schema: {
    type: "object",
    additionalProperties: false,
    required: [
      "introduction",
      "sections",
      "conclusion",
      "metaDescription",
      "heroImagePrompt",
      "callToActionPlacement",
      "suggestedSlug",
    ],
    properties: {
      introduction: { type: "string" },
      conclusion: { type: "string" },
      metaDescription: { type: "string" },
      heroImagePrompt: { type: "string" },
      callToActionPlacement: {
        type: "string",
        enum: ["intro", "mid", "end"],
        default: "end",
      },
      suggestedSlug: { type: "string" },
      sections: {
        type: "array",
        minItems: 3,
        maxItems: 8,
        items: {
          type: "object",
          required: ["heading", "summary", "body", "bulletPoints", "keywords", "imagePrompt"],
          properties: {
            heading: { type: "string" },
            summary: { type: "string" },
            body: { type: "string" },
            bulletPoints: {
              type: "array",
              minItems: 2,
              maxItems: 5,
              items: { type: "string" },
            },
            keywords: {
              type: "array",
              minItems: 1,
              maxItems: 4,
              items: { type: "string" },
            },
            imagePrompt: { type: "string" },
          },
        },
      },
    },
  },
} as const;

type ArticleDraftSchema = {
  introduction: string;
  conclusion: string;
  metaDescription: string;
  heroImagePrompt: string;
  callToActionPlacement: "intro" | "mid" | "end";
  suggestedSlug: string;
  sections: ArticleDraftSection[];
};

export type ArticleDraftParams = {
  title: string;
  category: string;
  tone: string;
  brief: string;
  targetWords: number;
  keywords: string[];
  styleProfile?: StyleProfileContext | null;
  cta?: CTAContext | null;
};

const formatStyleContext = (style?: StyleProfileContext | null) => {
  if (!style) return "ユーザー指定のデフォルトトーン";
  const parts = [style.profileName, style.tone, style.textStyle, style.vocabularyLevel]
    .filter(Boolean)
    .join(" / ");
  if (style.summary) {
    return `${parts} ｜ ${style.summary}`;
  }
  if (style.notes) {
    return `${parts} ｜ ${style.notes}`;
  }
  return parts || "ユーザー指定のデフォルトトーン";
};

const buildPrompt = (params: ArticleDraftParams) => {
  const keywordLine = params.keywords.length
    ? `優先キーワード: ${params.keywords.join(", ")}`
    : "";
  const ctaLine = params.cta
    ? `CTA情報: ${params.cta.name} => ${params.cta.content}${params.cta.link ? ` (${params.cta.link})` : ""}`
    : "CTA情報: なし";

  return [
    "あなたはnote.com向けのシニア編集者です。以下の制約を守って日本語で記事構成を作成し、JSONで返してください。",
    `タイトル: ${params.title}`,
    `カテゴリ: ${params.category}`,
    `トーン: ${params.tone}`,
    `スタイル: ${formatStyleContext(params.styleProfile)}`,
    `目標文字数: 約${params.targetWords}文字 (見出し付き)` ,
    `クリエイターからの概要: ${params.brief}`,
    keywordLine,
    `${ctaLine}。自然な文脈で紹介し、押し付けがましくしないこと。`,
    `note読者は実践的なインサイトとストーリー性を好む。導入→課題→解決策→まとめの流れを意識すること。`,
  ]
    .filter(Boolean)
    .join("\n\n");
};

export const generateArticleDraft = async (params: ArticleDraftParams): Promise<ArticleDraft> => {
  const openai = getOpenAIClient();
  const responsePayload = {
    model: getResponsesModel(),
    input: [
      {
        role: "system",
        content:
          "You are an expert Japanese editor who outputs only JSON that follows the provided schema. Avoid escape sequences except for standard JSON requirements.",
      },
      {
        role: "user",
        content: buildPrompt(params),
      },
    ],
    response_format: { type: "json_schema", json_schema: draftSchema },
    temperature: 0.7,
    max_output_tokens: 1600,
  } satisfies ResponseCreateParamsNonStreaming & {
    response_format: { type: "json_schema"; json_schema: typeof draftSchema };
  };

  const response = await openai.responses.create(responsePayload);

  const text = extractResponseText(response);
  const parsed = safeJSONParse<ArticleDraftSchema>(text);

  return parsed;
};

export const composeMarkdownFromDraft = (
  draft: ArticleDraft,
  title: string,
  cta?: CTAContext | null,
): { markdown: string; wordCount: number } => {
  const lines: string[] = [];
  lines.push(`# ${title.trim()}\n`);
  lines.push(draft.introduction.trim());

  draft.sections.forEach((section) => {
    lines.push(`\n## ${section.heading.trim()}`);
    lines.push(section.summary.trim());
    lines.push(section.body.trim());
    if (section.bulletPoints.length) {
      lines.push("\n" + section.bulletPoints.map((point) => `- ${point}`).join("\n"));
    }
  });

  lines.push(`\n## まとめ`);
  lines.push(draft.conclusion.trim());

  if (cta) {
    lines.push("\n## CTA");
    lines.push(cta.content.trim());
    if (cta.link) {
      lines.push(`リンク: ${cta.link}`);
    }
  }

  const markdown = lines.join("\n\n").replace(/\n{3,}/g, "\n\n");
  const wordCount = markdown.split(/\s+/).filter(Boolean).length;
  return { markdown, wordCount };
};

export const buildStyleProfileContext = (
  profile?: Database["public"]["Tables"]["style_profiles"]["Row"] | null,
): StyleProfileContext | null => {
  if (!profile) return null;
  const analysis = (profile.analysis_data as Record<string, unknown> | null) ?? null;
  return {
    profileName: profile.profile_name,
    tone: profile.tone,
    textStyle: profile.text_style,
    vocabularyLevel: profile.vocabulary_level,
    notes: typeof analysis?.notes === "string" ? analysis.notes : null,
    summary: typeof analysis?.summary === "string" ? analysis.summary : null,
  };
};

export const buildCtaContext = (
  cta?: Database["public"]["Tables"]["cta_settings"]["Row"] | null,
): CTAContext | null => {
  if (!cta) return null;
  return {
    name: cta.cta_name,
    content: cta.cta_content ?? "",
    link: cta.cta_link,
  };
};
