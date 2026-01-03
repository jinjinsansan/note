export const SEO_CATEGORIES = [
  "マーケティング",
  "スタートアップ",
  "エンジニアリング",
  "ライフスタイル",
  "クリエイティブ",
  "教育",
  "キャリア",
  "ヘルスケア",
  "サステナビリティ",
  "投資・ファイナンス",
] as const;

const categorySeeds: Record<(typeof SEO_CATEGORIES)[number], string[]> = {
  "マーケティング": ["集客", "リード獲得", "コンテンツ戦略"],
  "スタートアップ": ["資金調達", "PMF", "グロース"],
  "エンジニアリング": ["開発効率", "テスト自動化", "アーキテクチャ"],
  "ライフスタイル": ["ワークライフバランス", "朝活", "ミニマリズム"],
  "クリエイティブ": ["デザイン思考", "ライティング", "ブランディング"],
  "教育": ["リスキリング", "オンライン学習", "ティーチング"],
  "キャリア": ["転職", "副業", "リーダーシップ"],
  "ヘルスケア": ["メンタルヘルス", "ウェルビーイング", "食習慣"],
  "サステナビリティ": ["脱炭素", "ESG", "循環型社会"],
  "投資・ファイナンス": ["資産運用", "ファイナンシャルプラン", "インデックス投資"],
};

export const getCategorySeeds = (category: string) => {
  return categorySeeds[category as keyof typeof categorySeeds] ?? [category, `${category} トレンド`];
};

export const pseudoMetric = (seed: string, modulus: number, offset = 0) => {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) % 100000;
  }
  return (hash % modulus) + offset;
};
