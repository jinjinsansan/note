import type {
  ArticleMetrics,
  CharRatios,
  SentenceEndingStats,
  WordStat,
} from "@/lib/text-analysis";

export type StyleAnalysisResponse = {
  profileName: string;
  tone: string;
  textStyle: string;
  vocabularyLevel: string;
  summary: string;
  stats: {
    averageSentenceLength: number;
    averageParagraphLength: number;
    punctuationDensity: number;
    charRatios: CharRatios;
    sentenceEnding: SentenceEndingStats;
  };
  topWords: WordStat[];
  samples: {
    source: string;
    metrics: ArticleMetrics;
  }[];
};
