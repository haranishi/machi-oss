// 街の通信簿 — 気象庁（JMA）クライアント【雛形】
// =============================================================================
// 実エンドポイント: https://www.jma.go.jp/bosai/forecast/data/forecast/{areaCode}.json
//   - 認証: 不要（キーレス公開JSON）。出典「気象庁」の明記が必要。
//   - areaCode は気象庁の予報区コード（都道府県単位・例: 東京=130000, 大阪=270000）。
//     ※ 全国地方公共団体コード（市区町村5桁）とは別系統なので対応表が必要。
//   - 予報JSONは「天気・気温・降水確率」等の短期予報。
//     “晴れ日数/年平均気温/積雪” のような気候統計は別途、気象庁の平年値データや
//     e-Stat から用意する想定（本APIは現在天候の補助に使う）。
//
// ⚠️ 現状は雛形。気候サマリ（climate）は data.ts のモックを返す（実API呼び出しなし）。
// =============================================================================
import { getMunicipality, type Municipality } from "@/lib/data";

const BASE = "https://www.jma.go.jp/bosai/forecast/data/forecast";

/** 全国地方公共団体コード先頭2桁（都道府県）→ 気象庁 予報区コード（雛形・主要のみ）。 */
const PREF_TO_JMA_AREA: Record<string, string> = {
  "01": "016000", // 北海道（石狩・空知・後志）
  "13": "130000", // 東京都
  "14": "140000", // 神奈川県
  "12": "120000", // 千葉県
  "27": "270000", // 大阪府
  "28": "280000", // 兵庫県
  "40": "400000", // 福岡県
};

/** 団体コードから気象庁予報区コードを引く（未対応は null）。 */
export function toJmaAreaCode(code: string): string | null {
  return PREF_TO_JMA_AREA[code.slice(0, 2)] ?? null;
}

// --- 予報JSONの型（最小限。実スキーマは配列入れ子が深いので実装時に拡張） -------------
export type JmaForecast = {
  publishingOffice: string;
  reportDatetime: string;
  timeSeries: unknown[];
};

/**
 * 気象庁の予報JSONを取得（キー不要）。短期予報の表示などに利用。
 * ※ 比較ページ等で使う気候サマリは getClimate を参照（こちらは生の予報）。
 */
export async function fetchForecast(areaCode: string): Promise<JmaForecast> {
  const res = await fetch(`${BASE}/${areaCode}.json`, {
    // 予報は更新頻度が高いので短め（1時間）に再検証。
    next: { revalidate: 60 * 60 },
  });
  if (!res.ok) {
    throw new Error(`JMA forecast ${areaCode} failed: ${res.status} ${res.statusText}`);
  }
  return (await res.json()) as JmaForecast;
}

/**
 * 市区町村の気候サマリ（晴れ日数・平均気温・積雪有無）。
 * 気象庁の短期予報からは年間統計を作れないため、当面は data.ts のモックを返す。
 * 本番では気象庁 平年値（地点別CSV）等を取り込んで算出する想定。
 */
export async function getClimate(code: string): Promise<Municipality["climate"]> {
  return (
    getMunicipality(code)?.climate ?? { sunnyDays: 0, avgTemp: 0, snowy: false }
  );
}
