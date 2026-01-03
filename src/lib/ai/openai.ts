import OpenAI from "openai";

let cachedClient: OpenAI | null = null;

export const getOpenAIClient = () => {
  if (cachedClient) {
    return cachedClient;
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not configured");
  }

  cachedClient = new OpenAI({ apiKey });
  return cachedClient;
};

export const getResponsesModel = () => process.env.OPENAI_RESPONSES_MODEL ?? "gpt-4.1-mini";

export const getImagesModel = () => process.env.OPENAI_IMAGES_MODEL ?? "gpt-image-1";

export const ensureOpenAIConfigured = () => {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is not configured");
  }
};
