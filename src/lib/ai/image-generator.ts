import { getImagesModel, getOpenAIClient } from "./openai";

export type ImagePrompt = {
  headingId?: string | null;
  prompt: string;
  size?: "512x512" | "1024x1024";
};

export type GeneratedImage = {
  headingId?: string | null;
  imageUrl: string;
  altText: string;
  prompt: string;
};

export const generateImagesForArticle = async (
  prompts: ImagePrompt[],
): Promise<GeneratedImage[]> => {
  if (!prompts.length) return [];
  const openai = getOpenAIClient();
  const results: GeneratedImage[] = [];

  for (const prompt of prompts) {
    const response = await openai.images.generate({
      model: getImagesModel(),
      prompt: `${prompt.prompt}\nスタイル: 手描きではなく高品質なデジタルアート。note.com 記事用のアイキャッチ。`,
      size: prompt.size ?? "1024x1024",
      n: 1,
      quality: "high",
    });

    const data = response.data?.[0];
    if (data?.url) {
      results.push({
        headingId: prompt.headingId,
        imageUrl: data.url,
        altText: prompt.prompt.slice(0, 120),
        prompt: prompt.prompt,
      });
    }
  }

  return results;
};
