// 街の通信簿 — データ層
// ⚠️ 現在は MOCK（デモ用の仮データ）。将来は不動産情報ライブラリ/e-Stat/気象庁APIから生成して
//    Supabase に正規化保存する（supabase/migrations 参照）。本番では出典を明記すること。

export const MOCK = true;

export const SOURCES = {
  price: "国土交通省 不動産情報ライブラリ（取引価格・地価）",
  stats: "総務省 e-Stat（人口・世帯・高齢化）",
  hazard: "国土交通省 不動産情報ライブラリ（ハザード）",
  weather: "気象庁",
} as const;

export type Hazard = { flood: number; landslide: number; quake: number; tsunami: number }; // 0=低 …3=高

export type Municipality = {
  code: string; // 全国地方公共団体コード
  name: string;
  pref: string;
  region: string;
  population: number;
  households: number;
  popTrend: number; // 人口増減率 %（直近）
  aging: number; // 高齢化率 %
  landPrice: number; // 公示地価 平均 円/m²
  landPriceTrend: number; // 地価変動 %
  rentAvg: number; // 参考家賃（1LDK 万円）
  txPriceAvg: number; // 中古マンション取引 平均（万円）
  hazards: Hazard;
  facilities: { school: number; hospital: number; park: number; daycare: number; supermarket: number };
  climate: { sunnyDays: number; avgTemp: number; snowy: boolean };
  blurb: string; // こんな人向け
};

export const municipalities: Municipality[] = [
  {
    code: "13112", name: "世田谷区", pref: "東京都", region: "関東",
    population: 920000, households: 490000, popTrend: 0.5, aging: 21,
    landPrice: 620000, landPriceTrend: 2.5, rentAvg: 12.5, txPriceAvg: 6800,
    hazards: { flood: 2, landslide: 0, quake: 2, tsunami: 0 },
    facilities: { school: 90, hospital: 60, park: 120, daycare: 80, supermarket: 70 },
    climate: { sunnyDays: 200, avgTemp: 16, snowy: false },
    blurb: "利便と教育のバランス型。家賃は高め、多摩川沿いは浸水に注意。",
  },
  {
    code: "14100", name: "横浜市", pref: "神奈川県", region: "関東",
    population: 3770000, households: 1700000, popTrend: 0.1, aging: 25,
    landPrice: 230000, landPriceTrend: 1.0, rentAvg: 9.5, txPriceAvg: 4200,
    hazards: { flood: 2, landslide: 1, quake: 2, tsunami: 1 },
    facilities: { school: 500, hospital: 300, park: 600, daycare: 400, supermarket: 450 },
    climate: { sunnyDays: 200, avgTemp: 16, snowy: false },
    blurb: "都会と海。エリアで表情が大きく変わる大都市。",
  },
  {
    code: "12220", name: "流山市", pref: "千葉県", region: "関東",
    population: 210000, households: 90000, popTrend: 2.8, aging: 22,
    landPrice: 130000, landPriceTrend: 4.0, rentAvg: 7.8, txPriceAvg: 3500,
    hazards: { flood: 1, landslide: 0, quake: 2, tsunami: 0 },
    facilities: { school: 30, hospital: 18, park: 45, daycare: 40, supermarket: 28 },
    climate: { sunnyDays: 205, avgTemp: 15, snowy: false },
    blurb: "子育て世代が急増。TXで都心アクセス、コスパ良好。",
  },
  {
    code: "28203", name: "明石市", pref: "兵庫県", region: "近畿",
    population: 305000, households: 130000, popTrend: 0.9, aging: 27,
    landPrice: 120000, landPriceTrend: 1.5, rentAvg: 6.5, txPriceAvg: 2800,
    hazards: { flood: 1, landslide: 0, quake: 2, tsunami: 2 },
    facilities: { school: 45, hospital: 30, park: 60, daycare: 48, supermarket: 40 },
    climate: { sunnyDays: 210, avgTemp: 16, snowy: false },
    blurb: "子育て支援で移住人気。海沿いは津波の確認を。",
  },
  {
    code: "40130", name: "福岡市", pref: "福岡県", region: "九州",
    population: 1630000, households: 850000, popTrend: 1.2, aging: 22,
    landPrice: 250000, landPriceTrend: 3.0, rentAvg: 7.0, txPriceAvg: 3600,
    hazards: { flood: 1, landslide: 1, quake: 1, tsunami: 1 },
    facilities: { school: 220, hospital: 160, park: 280, daycare: 200, supermarket: 210 },
    climate: { sunnyDays: 195, avgTemp: 17, snowy: false },
    blurb: "若くて元気。コスパと都会感を両立する人気都市。",
  },
  {
    code: "01100", name: "札幌市", pref: "北海道", region: "北海道",
    population: 1960000, households: 1000000, popTrend: -0.2, aging: 28,
    landPrice: 110000, landPriceTrend: 2.0, rentAvg: 5.8, txPriceAvg: 3000,
    hazards: { flood: 1, landslide: 1, quake: 1, tsunami: 0 },
    facilities: { school: 300, hospital: 220, park: 740, daycare: 260, supermarket: 300 },
    climate: { sunnyDays: 170, avgTemp: 9, snowy: true },
    blurb: "広くて家賃が安い。冬の雪と寒さは覚悟が必要。",
  },
];

export function getMunicipality(code: string) {
  return municipalities.find((m) => m.code === code);
}

const clamp = (n: number) => Math.max(0, Math.min(100, Math.round(n)));

// 4軸スコア（0-100・モック計算）
export function scores(m: Municipality) {
  const hazardSum = m.hazards.flood + m.hazards.landslide + m.hazards.quake + m.hazards.tsunami; // 0-12
  return {
    childcare: clamp(52 + m.popTrend * 5 - (m.aging - 24) * 1.6 + (m.facilities.daycare / m.population) * 1_000_00),
    safety: clamp(100 - hazardSum * 8),
    convenience: clamp(38 + (m.facilities.supermarket / m.population) * 1_500_00 + Math.min(m.landPrice / 9000, 34)),
    cost: clamp(112 - m.rentAvg * 7 - m.landPrice / 7000),
  };
}

export function overall(m: Municipality) {
  const s = scores(m);
  return Math.round((s.childcare + s.safety + s.convenience + s.cost) / 4);
}

export const SCORE_LABELS: Record<keyof ReturnType<typeof scores>, string> = {
  childcare: "子育て",
  safety: "防災",
  convenience: "利便",
  cost: "コスパ",
};

export const HAZARD_LABELS: Record<keyof Hazard, string> = {
  flood: "洪水",
  landslide: "土砂",
  quake: "地震",
  tsunami: "津波",
};

export const yen = (n: number) => n.toLocaleString("ja-JP");
