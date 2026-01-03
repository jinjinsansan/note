type ResponseTextBlock =
  | string
  | {
      value?: string | null;
      annotations?: unknown[];
    };

type ResponseContentBlock = {
  type?: string;
  text?: ResponseTextBlock | null;
};

type OpenAIResponseLike = {
  output?: Array<{
    content?: ResponseContentBlock[] | null;
  }>;
};

const normalizeResponseText = (text?: ResponseTextBlock | null): string => {
  if (!text) return "";
  if (typeof text === "string") {
    return text;
  }
  return text.value ?? "";
};

export const extractResponseText = (response: unknown): string => {
  const output = (response as OpenAIResponseLike | undefined)?.output ?? [];
  for (const item of output) {
    const contents = item.content ?? [];
    for (const content of contents) {
      const value = normalizeResponseText(content?.text);
      if (content?.type === "output_text" && value.trim()) {
        return value.trim();
      }
      if (value.trim()) {
        return value.trim();
      }
    }
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
