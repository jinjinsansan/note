import TinySegmenter from "tiny-segmenter";

const sentenceRegex = /(?<=[。！？!?\.])\s*/;

const tokenizeSentences = (text: string) =>
  text
    .split(sentenceRegex)
    .map((chunk) => chunk.trim())
    .filter((chunk) => chunk.length > 0);

const tokenizeParagraphs = (text: string) =>
  text
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);

const segmenter = new TinySegmenter();
const japaneseCharRegex = /[\u3040-\u30FF\u4E00-\u9FFF]/;
const sanitizeToken = (token: string) => token.replace(/[^\p{L}\p{N}]/gu, "").toLowerCase();
const stopwords = new Set([
  "こと",
  "よう",
  "それ",
  "ため",
  "する",
  "いる",
  "なる",
  "これ",
  "あの",
  "その",
  "そして",
  "but",
  "and",
  "the",
]);

const tokenizeWords = (text: string) => {
  if (japaneseCharRegex.test(text)) {
    return segmenter.segment(text.replace(/\s+/g, ""));
  }
  return text.split(/\s+/);
};

const countOccurrences = (text: string, pattern: RegExp) => {
  const matches = text.match(pattern);
  return matches ? matches.length : 0;
};

const estimateToneFromRatios = (formalRatio: number, punctuationDensity: number) => {
  if (formalRatio > 0.05 && punctuationDensity < 0.05) return "フォーマル";
  if (formalRatio < 0.02 && punctuationDensity > 0.08) return "カジュアル";
  return "ニュートラル";
};

const estimateVocabularyLevel = (uniqueRatio: number) => {
  if (uniqueRatio > 0.4) return "上級";
  if (uniqueRatio > 0.25) return "中級";
  return "初級";
};

const estimateTextStyle = (avgSentenceLength: number) => {
  if (avgSentenceLength > 30) return "長文";
  if (avgSentenceLength < 15) return "短文";
  return "混合";
};

const classifyChar = (char: string) => {
  if (/^[\u4E00-\u9FFF\u3400-\u4DBF]$/.test(char)) return "kanji" as const;
  if (/^[\u3040-\u309F]$/.test(char)) return "hiragana" as const;
  if (/^[\u30A0-\u30FF\u31F0-\u31FF]$/.test(char)) return "katakana" as const;
  if (/^[A-Za-z]$/.test(char)) return "latin" as const;
  return "other" as const;
};

const analyzeSentenceEndings = (sentences: string[]) => {
  let desuMasu = 0;
  let daDeAru = 0;
  let other = 0;
  sentences.forEach((sentence) => {
    const trimmed = sentence.trim();
    if (!trimmed) return;
    const normalized = trimmed.replace(/[。！？!?]+$/gu, "");
    if (/[ですますでしたでしょう]?$/u.test(normalized)) {
      desuMasu += 1;
    } else if (/[だであるだっただろう]?$/u.test(normalized)) {
      daDeAru += 1;
    } else {
      other += 1;
    }
  });
  const total = desuMasu + daDeAru + other || 1;
  const dominant = desuMasu / total > 0.55
    ? "ですます調"
    : daDeAru / total > 0.55
      ? "だである調"
      : "ミックス";
  return {
    desuMasuRatio: desuMasu / total,
    daDeAruRatio: daDeAru / total,
    otherRatio: other / total,
    dominant,
  };
};

const buildWordFrequency = (tokens: string[]) => {
  const map = new Map<string, number>();
  for (const token of tokens) {
    const sanitized = sanitizeToken(token);
    if (!sanitized || sanitized.length < 2 || stopwords.has(sanitized)) {
      continue;
    }
    map.set(sanitized, (map.get(sanitized) ?? 0) + 1);
  }
  return Array.from(map.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 50)
    .map(([word, count]) => ({ word, count }));
};

const computeCharRatios = (text: string) => {
  const counts = {
    kanji: 0,
    hiragana: 0,
    katakana: 0,
    latin: 0,
    other: 0,
  };
  const clean = text.replace(/\s+/g, "");
  for (const char of clean) {
    const type = classifyChar(char);
    counts[type] += 1;
  }
  const total = Object.values(counts).reduce((sum, value) => sum + value, 0) || 1;
  return {
    ratios: {
      kanji: counts.kanji / total,
      hiragana: counts.hiragana / total,
      katakana: counts.katakana / total,
      latin: counts.latin / total,
      other: counts.other / total,
    },
    total,
  };
};

export type WordStat = { word: string; count: number };

export type CharRatios = {
  kanji: number;
  hiragana: number;
  katakana: number;
  latin: number;
  other: number;
};

export type SentenceEndingStats = {
  desuMasuRatio: number;
  daDeAruRatio: number;
  otherRatio: number;
  dominant: string;
};

export type ArticleMetrics = {
  wordCount: number;
  sentenceCount: number;
  paragraphCount: number;
  averageSentenceLength: number;
  averageParagraphLength: number;
  punctuationDensity: number;
  formalRatio: number;
  uniqueWordRatio: number;
  charRatios: CharRatios;
  topWords: WordStat[];
  sentenceEnding: SentenceEndingStats;
};

export type AggregatedStyle = {
  tone: string;
  textStyle: string;
  vocabularyLevel: string;
  averageSentenceLength: number;
  averageParagraphLength: number;
  punctuationDensity: number;
  charRatios: CharRatios;
  sentenceEnding: SentenceEndingStats;
  topWords: WordStat[];
  summary: string;
};

export const analyzeArticleText = (text: string): ArticleMetrics => {
  const sentences = tokenizeSentences(text);
  const paragraphs = tokenizeParagraphs(text);
  const tokenizedWords = tokenizeWords(text);
  const words = tokenizedWords
    .map((word) => sanitizeToken(word))
    .filter(Boolean);
  const uniqueWords = new Set(words);

  const averageSentenceLength = sentences.length ? words.length / sentences.length : words.length;
  const averageParagraphLength = paragraphs.length ? words.length / paragraphs.length : words.length;
  const punctuationDensity = words.length
    ? countOccurrences(text, /[。、,!?\.]/g) / words.length
    : 0;
  const formalRatio = words.length ? countOccurrences(text, /(です|ます)/g) / words.length : 0;
  const charData = computeCharRatios(text);
  const sentenceEnding = analyzeSentenceEndings(sentences);
  const topWords = buildWordFrequency(tokenizedWords);

  return {
    wordCount: words.length,
    sentenceCount: sentences.length,
    paragraphCount: paragraphs.length,
    averageSentenceLength,
    averageParagraphLength,
    punctuationDensity,
    formalRatio,
    uniqueWordRatio: words.length ? uniqueWords.size / words.length : 0,
    charRatios: charData.ratios,
    sentenceEnding,
    topWords,
  };
};

export const aggregateStyleMetrics = (metrics: ArticleMetrics[]): AggregatedStyle => {
  const count = metrics.length || 1;
  const sum = metrics.reduce(
    (acc, metric) => {
      acc.averageSentenceLength += metric.averageSentenceLength;
      acc.averageParagraphLength += metric.averageParagraphLength;
      acc.punctuationDensity += metric.punctuationDensity;
      acc.formalRatio += metric.formalRatio;
      acc.uniqueWordRatio += metric.uniqueWordRatio;
      acc.charRatios.kanji += metric.charRatios.kanji;
      acc.charRatios.hiragana += metric.charRatios.hiragana;
      acc.charRatios.katakana += metric.charRatios.katakana;
      acc.charRatios.latin += metric.charRatios.latin;
      acc.charRatios.other += metric.charRatios.other;
      acc.sentenceEnding.desuMasuRatio += metric.sentenceEnding.desuMasuRatio;
      acc.sentenceEnding.daDeAruRatio += metric.sentenceEnding.daDeAruRatio;
      acc.sentenceEnding.otherRatio += metric.sentenceEnding.otherRatio;
      return acc;
    },
    {
      averageSentenceLength: 0,
      averageParagraphLength: 0,
      punctuationDensity: 0,
      formalRatio: 0,
      uniqueWordRatio: 0,
      charRatios: { kanji: 0, hiragana: 0, katakana: 0, latin: 0, other: 0 },
      sentenceEnding: { desuMasuRatio: 0, daDeAruRatio: 0, otherRatio: 0 },
    },
  );

  const avgSentence = sum.averageSentenceLength / count;
  const avgParagraph = sum.averageParagraphLength / count;
  const punctuationDensity = sum.punctuationDensity / count;
  const formalRatio = sum.formalRatio / count;
  const uniqueWordRatio = sum.uniqueWordRatio / count;
  const charRatios: CharRatios = {
    kanji: sum.charRatios.kanji / count,
    hiragana: sum.charRatios.hiragana / count,
    katakana: sum.charRatios.katakana / count,
    latin: sum.charRatios.latin / count,
    other: sum.charRatios.other / count,
  };
  const avgSentenceEnding = {
    desuMasuRatio: sum.sentenceEnding.desuMasuRatio / count,
    daDeAruRatio: sum.sentenceEnding.daDeAruRatio / count,
    otherRatio: sum.sentenceEnding.otherRatio / count,
  };
  const maxEnding = Math.max(
    avgSentenceEnding.desuMasuRatio,
    avgSentenceEnding.daDeAruRatio,
    avgSentenceEnding.otherRatio,
  );
  const sentenceEnding: SentenceEndingStats = {
    ...avgSentenceEnding,
    dominant:
      maxEnding === avgSentenceEnding.desuMasuRatio
        ? "ですます調"
        : maxEnding === avgSentenceEnding.daDeAruRatio
          ? "だである調"
          : "ミックス",
  };

  const tone = estimateToneFromRatios(formalRatio, punctuationDensity);
  const textStyle = estimateTextStyle(avgSentence);
  const vocabularyLevel = estimateVocabularyLevel(uniqueWordRatio);
  const topWordsMap = new Map<string, number>();
  metrics.forEach((metric) => {
    metric.topWords.forEach(({ word, count }) => {
      topWordsMap.set(word, (topWordsMap.get(word) ?? 0) + count);
    });
  });
  const topWords = Array.from(topWordsMap.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 50)
    .map(([word, count]) => ({ word, count }));

  const summary = `平均文長${avgSentence.toFixed(1)}語・段落${avgParagraph.toFixed(
    1,
  )}語。語彙多様性${(uniqueWordRatio * 100).toFixed(0)}%、漢字${(
    charRatios.kanji * 100
  ).toFixed(0)}%/ひらがな${(charRatios.hiragana * 100).toFixed(0)}%。`;

  return {
    tone,
    textStyle,
    vocabularyLevel,
    averageSentenceLength: avgSentence,
    averageParagraphLength: avgParagraph,
    punctuationDensity,
    charRatios,
    sentenceEnding,
    topWords,
    summary,
  };
};
