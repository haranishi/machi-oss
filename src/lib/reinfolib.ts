// 街の通信簿 — 不動産情報ライブラリ（国交省 reinfolib）クライアント【雛形】
// =============================================================================
// 実エンドポイント（ベース）: https://www.reinfolib.mlit.go.jp/ex-api/external/...
//   - 認証: リクエストヘッダ  Ocp-Apim-Subscription-Key: <REINFOLIB_API_KEY>
//   - 主なAPI（コードは要・公式確認）:
//       XIT001  不動産取引価格情報    GET /ex-api/external/XIT001?year=YYYY&area=PP&city=CCCCC
//       XIT002  都道府県内市区町村一覧  GET /ex-api/external/XIT002?area=PP
//       XKT/XPT 系  ハザード・施設・地価のベクタタイル(GeoJSON/PBF)
//   - レート制限あり（多重リクエスト不可・間隔を空ける）。本番は api_cache に一次キャッシュ。
//
// ⚠️ 現状は雛形。REINFOLIB_API_KEY 未設定時は data.ts のモックを返す（実API呼び出しなし）。
// =============================================================================
import { getMunicipality, type Hazard, type Municipality } from "@/lib/data";

const BASE = "https://www.reinfolib.mlit.go.jp/ex-api/external";
const KEY = process.env.REINFOLIB_API_KEY;

/** APIが利用可能か（キーが設定されているか）。 */
export const reinfolibEnabled = Boolean(KEY);

type QueryParams = Record<string, string | number>;

/** 共通フェッチャ（ヘッダ認証 + 日次キャッシュ）。キー必須。 */
async function reinfolibFetch<T>(path: string, params: QueryParams): Promise<T> {
  const qs = new URLSearchParams(
    Object.fromEntries(Object.entries(params).map(([k, v]) => [k, String(v)])),
  ).toString();

  const res = await fetch(`${BASE}${path}?${qs}`, {
    headers: { "Ocp-Apim-Subscription-Key": KEY ?? "" },
    // 日次バッチ想定。Next.js 16 は fetch を既定で no-store のため明示的に再検証間隔を設定。
    next: { revalidate: 60 * 60 * 24 },
  });
  if (!res.ok) {
    throw new Error(`reinfolib ${path} failed: ${res.status} ${res.statusText}`);
  }
  return (await res.json()) as T;
}

// --- レスポンス型（最小限。実スキーマは公式仕様に合わせて拡張すること） -------------
export type TransactionPriceRow = {
  Type?: string;        // 種類（例: 中古マンション等）
  TradePrice?: string;  // 取引価格（円）
  Period?: string;      // 取引時期
};
type TransactionPriceResponse = { status: string; data: TransactionPriceRow[] };

/**
 * 中古マンション等の取引平均（万円）。
 * 実装時は XIT001 を年・地域で取得し Type で絞って平均する想定。
 */
export async function getTransactionPriceAvg(code: string): Promise<number> {
  const mock = getMunicipality(code)?.txPriceAvg ?? 0;
  if (!KEY) return mock; // モックフォールバック
  // 例: GET /XIT001?year=2024&area=PP&city=CCCCC （area=都道府県コード, city=団体コード）
  const res = await reinfolibFetch<TransactionPriceResponse>("/XIT001", {
    year: new Date().getFullYear() - 1,
    area: code.slice(0, 2),
    city: code,
  });
  void res; // TODO: res.data を集計して中古マンション平均（万円）を返す
  return mock;
}

/**
 * ハザード判定（洪水・土砂・地震・津波）。
 * 実装時は XKT/XPT 系のベクタタイル/区域APIを地点で評価する想定。
 */
export async function getHazards(code: string): Promise<Hazard> {
  const mock = getMunicipality(code)?.hazards ?? { flood: 0, landslide: 0, quake: 0, tsunami: 0 };
  if (!KEY) return mock; // モックフォールバック
  // TODO: 洪水浸水想定区域 / 土砂災害警戒区域 / 津波浸水想定 等を取得しレベル化
  return mock;
}

/** 施設件数（学校・病院・公園・保育・スーパー）。実装時は施設系タイルAPIを集計。 */
export async function getFacilities(code: string): Promise<Municipality["facilities"]> {
  const mock =
    getMunicipality(code)?.facilities ??
    { school: 0, hospital: 0, park: 0, daycare: 0, supermarket: 0 };
  if (!KEY) return mock; // モックフォールバック
  // TODO: 学校(XKT006相当)・医療機関・都市公園 等の件数を取得
  return mock;
}
