import { getOpenAIClient, getResponsesModel } from "./openai";
import { extractResponseText, safeJSONParse } from "./utils";

export type KeywordIdea = {
  keyword: string;
  searchVolume: number;
  difficultyScore: number;
  trendScore: number;
  difficultyLevel: "low" | "medium" | "high";
  rationale: string;
};

export type TitleIdea = {
  id: string;
  title: string;
  difficultyScore: number;
  seoScore: number;
  difficultyLevel: "low" | "medium" | "high";
  hook: string;
};

const keywordSchema = {
  name: "keyword_suggestions",
  schema: {
    type: "object",
    required: ["keywords"],
    properties: {
      keywords: {
        type: "array",
        minItems: 5,
        maxItems: 12,
        items: {
          type: "object",
          required: ["keyword", "searchVolume", "difficultyScore", "trendScore", "difficultyLevel", "rationale"],
          properties: {
            keyword: { type: "string" },
            searchVolume: { type: "integer", minimum: 10, maximum: 200000 },
            difficultyScore: { type: "number", minimum: 0, maximum: 100 },
            trendScore: { type: "number", minimum: 0, maximum: 100 },
            difficultyLevel: { type: "string", enum: ["low", "medium", "high"] },
            rationale: { type: "string" },
          },
        },
      },
    },
  },
} as const;

const titleSchema = {
  name: "title_suggestions",
  schema: {
    type: "object",
    required: ["titles"],
    properties: {
      titles: {
        type: "array",
        minItems: 5,
        maxItems: 10,
        items: {
          type: "object",
          required: ["id", "title", "seoScore", "difficultyLevel", "difficultyScore", "hook"],
          properties: {
            id: { type: "string" },
            title: { type: "string" },
            seoScore: { type: "number", minimum: 0, maximum: 100 },
            difficultyScore: { type: "number", minimum: 0, maximum: 100 },
            difficultyLevel: { type: "string", enum: ["low", "medium", "high"] },
            hook: { type: "string" },
          },
        },
      },
    },
  },
} as const;

type KeywordSchema = { keywords: KeywordIdea[] };
type TitleSchema = { titles: TitleIdea[] };

export const generateKeywordIdeas = async (params: {
  category: string;
  seed?: string;
  audience?: string;
}) => {
  const input = [
    `カテゴリ: ${params.category}`,
    params.seed ? `補足トピック: ${params.seed}` : "",
    params.audience ? `想定読者: ${params.audience}` : "",
    "検索ボリュームと難易度は推定値でよいので、実務感覚のある数字を提供してください。",
    "結果はJSONで返し、noteの記事化に適したロングテールも含めてください。",
  ]
    .filter(Boolean)
    .join("\n");

  const openai = getOpenAIClient();
  const response = await openai.responses.create({
    model: getResponsesModel(),
    input: [
      {
        role: "system",
        content:
          "You are an SEO strategist for Japanese creators. Return only JSON in the requested schema. Use realistic numeric ranges.",
      },
      { role: "user", content: input },
    ],
    response_format: { type: "json_schema", json_schema: keywordSchema },
    temperature: 0.4,
  });

  const text = extractResponseText(response);
  const parsed = safeJSONParse<KeywordSchema>(text);
  return parsed.keywords;
};

export const generateTitleIdeas = async (params: {
  keyword: string;
  difficulty?: "low" | "medium" | "high";
  tone?: string;
}) => {
  const openai = getOpenAIClient();
  const prompt = [
    `ターゲットキーワード: ${params.keyword}`,
    params.difficulty ? `狙う難易度: ${params.difficulty}` : "",
    params.tone ? `想定トーン: ${params.tone}` : "",
    "クリックを誘発しつつ誇大広告にならないnoteタイトルを作成してください。",
  ]
    .filter(Boolean)
    .join("\n");

  const response = await openai.responses.create({
    model: getResponsesModel(),
    input: [
      {
        role: "system",
        content:
          "You are a Japanese headline copywriter. Output only JSON for the schema, ranking ideas by impact. IDs should be short kebab-case strings.",
      },
      { role: "user", content: prompt },
    ],
    response_format: { type: "json_schema", json_schema: titleSchema },
    temperature: 0.5,
  });

  const text = extractResponseText(response);
  const parsed = safeJSONParse<TitleSchema>(text);
  return parsed.titles;
};
