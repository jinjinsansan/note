import type { Response } from "openai/resources/responses.mjs";

export const extractResponseText = (response: Response): string => {
  for (const item of response.output ?? []) {
    const content = item.content?.[0];
    if (content && content.type === "output_text" && content.text.trim()) {
      return content.text.trim();
    }
  }

  const fallback = response.output?.[0]?.content?.[0];
  if (fallback && "text" in fallback && fallback.text) {
    return fallback.text;
  }

  throw new Error("Failed to extract text from OpenAI response");
};

export const safeJSONParse = <T>(text: string): T => {
  try {
    return JSON.parse(text) as T;
  } catch (error) {
    console.error("Failed to parse JSON", error, text);
    throw new Error("OpenAI response could not be parsed");
  }
};
