import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { z } from "zod";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";

import { analyzeArticleText, aggregateStyleMetrics } from "@/lib/text-analysis";
import type { Database } from "@/types/supabase";

const ArticleInput = z.object({
  source: z.string().min(3, "URLまたはメモを入力してください"),
  content: z.string().min(200, "200文字以上の文章が必要です"),
});

const schema = z.object({
  profileName: z.string().min(2, "プロフィール名を入力してください"),
  articles: z.array(ArticleInput).min(1).max(5),
});

export async function POST(request: Request) {
  const supabase = createRouteHandlerClient<Database>({ cookies });
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const json = await request.json().catch(() => null);
  const parsed = schema.safeParse(json);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const articleMetrics = parsed.data.articles.map((article) => ({
    source: article.source,
    metrics: analyzeArticleText(article.content),
  }));

  const aggregated = aggregateStyleMetrics(articleMetrics.map((item) => item.metrics));

  return NextResponse.json({
    profileName: parsed.data.profileName,
    tone: aggregated.tone,
    textStyle: aggregated.textStyle,
    vocabularyLevel: aggregated.vocabularyLevel,
    summary: aggregated.summary,
    stats: {
      averageSentenceLength: aggregated.averageSentenceLength,
      averageParagraphLength: aggregated.averageParagraphLength,
      punctuationDensity: aggregated.punctuationDensity,
      charRatios: aggregated.charRatios,
      sentenceEnding: aggregated.sentenceEnding,
    },
    topWords: aggregated.topWords,
    samples: articleMetrics.map((item) => ({
      source: item.source,
      metrics: item.metrics,
    })),
  });
}
