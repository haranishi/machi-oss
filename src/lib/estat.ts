// 街の通信簿 — e-Stat（総務省 政府統計総合窓口）クライアント【雛形】
// =============================================================================
// 実エンドポイント（ベース）: https://api.e-stat.go.jp/rest/3.0/app/json/...
//   - 認証: クエリ ?appId=<ESTAT_APP_ID>（無料登録で発行）
//   - 主なAPI:
//       getStatsList  統計表の検索   GET /rest/3.0/app/json/getStatsList?appId=...&searchWord=人口
//       getStatsData  統計データ取得  GET /rest/3.0/app/json/getStatsData?appId=...&statsDataId=...&cdArea=CCCCC
//       getMetaInfo   表のメタ情報   GET /rest/3.0/app/json/getMetaInfo?appId=...&statsDataId=...
//   - cdArea に全国地方公共団体コード（5桁）を渡して市区町村で絞り込む。
//   - statsDataId は国勢調査/人口推計などの表ID（用途ごとに要・公式確認）。
//
// ⚠️ 現状は雛形。ESTAT_APP_ID 未設定時は data.ts のモックを返す（実API呼び出しなし）。
// =============================================================================
import { getMunicipality } from "@/lib/data";

const BASE = "https://api.e-stat.go.jp/rest/3.0/app/json";
const APP_ID = process.env.ESTAT_APP_ID;

/** APIが利用可能か（appId が設定されているか）。 */
export const estatEnabled = Boolean(APP_ID);

type QueryParams = Record<string, string | number>;

/** 共通フェッチャ（appId 付与 + 日次キャッシュ）。appId 必須。 */
async function estatFetch<T>(path: string, params: QueryParams): Promise<T> {
  const qs = new URLSearchParams(
    Object.fromEntries(
      Object.entries({ appId: APP_ID ?? "", ...params }).map(([k, v]) => [k, String(v)]),
    ),
  ).toString();

  const res = await fetch(`${BASE}${path}?${qs}`, {
    // Next.js 16 は fetch を既定で no-store のため、日次バッチ想定で再検証間隔を明示。
    next: { revalidate: 60 * 60 * 24 },
  });
  if (!res.ok) {
    throw new Error(`e-Stat ${path} failed: ${res.status} ${res.statusText}`);
  }
  return (await res.json()) as T;
}

// --- レスポンス型（最小限。実スキーマ GET_STATS_DATA は入れ子が深いので実装時に拡張） ----
export type EstatValue = { "@cat01"?: string; "@time"?: string; "@unit"?: string; $: string };
type GetStatsDataResponse = {
  GET_STATS_DATA?: {
    STATISTICAL_DATA?: {
      DATA_INF?: { VALUE?: EstatValue[] };
    };
  };
};

export type PopulationStats = {
  population: number; // 人口
  households: number; // 世帯数
  aging: number;      // 高齢化率 %
  popTrend: number;   // 人口増減率 %（直近）
};

/**
 * 市区町村の人口統計（人口・世帯・高齢化率・増減率）。
 * 実装時は getStatsData を statsDataId（国勢調査/人口推計）＋ cdArea=団体コード で取得し集計する。
 */
export async function getPopulationStats(code: string): Promise<PopulationStats> {
  const m = getMunicipality(code);
  const mock: PopulationStats = {
    population: m?.population ?? 0,
    households: m?.households ?? 0,
    aging: m?.aging ?? 0,
    popTrend: m?.popTrend ?? 0,
  };
  if (!APP_ID) return mock; // モックフォールバック
  // 例: GET /getStatsData?appId=...&statsDataId=<表ID>&cdArea=CCCCC
  const res = await estatFetch<GetStatsDataResponse>("/getStatsData", {
    statsDataId: "0000000000", // TODO: 国勢調査/人口推計の statsDataId に差し替え
    cdArea: code,
  });
  void res; // TODO: res.GET_STATS_DATA...VALUE を解析して各値を抽出
  return mock;
}
