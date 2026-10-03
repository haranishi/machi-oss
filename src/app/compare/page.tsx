import Link from "next/link";
import {
  municipalities,
  getMunicipality,
  scores,
  overall,
  SCORE_LABELS,
  HAZARD_LABELS,
  yen,
  type Municipality,
  type Hazard,
} from "@/lib/data";
import { ScoreBadge, HazardBadge } from "@/components/ui";

export const metadata = {
  title: "市区町村をくらべる｜街の通信簿",
  description:
    "2〜3の市区町村のスコア・人口・地価・取引価格・ハザード・気候を、国の公開データで横並び比較。引っ越し・住まい選びの意思決定に。",
};

const MAX = 3;

/** ?m=13112,14100,28203 を検証済みコード配列へ（重複除去・最大3件・存在チェック）。 */
function parseCodes(m: string | string[] | undefined): string[] {
  const raw = Array.isArray(m) ? m.join(",") : m ?? "";
  const out: string[] = [];
  const seen = new Set<string>();
  for (const part of raw.split(",")) {
    const c = part.trim();
    if (!c || seen.has(c) || !getMunicipality(c)) continue;
    seen.add(c);
    out.push(c);
    if (out.length >= MAX) break;
  }
  return out;
}

const compareHref = (codes: string[]) =>
  codes.length ? `/compare?m=${codes.join(",")}` : "/compare";

function scoreValue(m: Municipality, key: string): number {
  if (key === "overall") return overall(m);
  return scores(m)[key as keyof ReturnType<typeof scores>];
}

const scoreRows: { key: string; label: string }[] = [
  { key: "overall", label: "総合" },
  ...(Object.keys(SCORE_LABELS) as (keyof typeof SCORE_LABELS)[]).map((k) => ({
    key: k,
    label: SCORE_LABELS[k],
  })),
];

const metricRows: { label: string; value: (m: Municipality) => string }[] = [
  { label: "人口", value: (m) => `${yen(m.population)}人` },
  { label: "世帯数", value: (m) => yen(m.households) },
  { label: "人口増減", value: (m) => `${m.popTrend >= 0 ? "+" : ""}${m.popTrend}%` },
  { label: "高齢化率", value: (m) => `${m.aging}%` },
  { label: "公示地価", value: (m) => `${yen(m.landPrice)}円/m²` },
  { label: "中古マンション", value: (m) => `${yen(m.txPriceAvg)}万円` },
  { label: "家賃(1LDK)", value: (m) => `${m.rentAvg}万円` },
  { label: "平均気温", value: (m) => `${m.climate.avgTemp}℃` },
  { label: "晴れの日", value: (m) => `${m.climate.sunnyDays}日/年` },
  { label: "雪", value: (m) => (m.climate.snowy ? "多い" : "少ない") },
];

const hazardKeys = Object.keys(HAZARD_LABELS) as (keyof Hazard)[];

export default async function ComparePage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const sp = await searchParams;
  const codes = parseCodes(sp.m);
  const selected = codes.map((c) => getMunicipality(c)!);
  const rest = municipalities.filter((m) => !codes.includes(m.code));

  return (
    <main className="mx-auto w-full max-w-4xl px-5 py-10">
      <p className="text-xs font-bold uppercase tracking-[0.2em] text-amber-700">Compare</p>
      <h1 className="mt-1 text-3xl font-bold text-stone-900">市区町村をくらべる</h1>
      <p className="mt-2 max-w-xl text-stone-600">
        2〜3の街を選んで、スコアと主要データを横並びで比較できます。
      </p>

      {selected.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-stone-200 bg-white p-6">
          <p className="font-semibold text-stone-900">比較する街を選んでください</p>
          <p className="mt-1 text-sm text-stone-600">人気の組み合わせから試す：</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Link
              href="/compare?m=13112,14100,12220"
              className="rounded-full border border-stone-300 px-3 py-1.5 text-sm text-stone-700 hover:border-stone-400 hover:bg-stone-50"
            >
              世田谷区・横浜市・流山市
            </Link>
            <Link
              href="/compare?m=28203,40130,01100"
              className="rounded-full border border-stone-300 px-3 py-1.5 text-sm text-stone-700 hover:border-stone-400 hover:bg-stone-50"
            >
              明石市・福岡市・札幌市
            </Link>
          </div>
        </div>
      ) : (
        <div className="mt-8 overflow-x-auto">
          <table className="w-full min-w-[34rem] border-collapse text-sm">
            <thead>
              <tr>
                <th className="sticky left-0 z-10 bg-stone-50 p-2 text-left align-bottom" />
                {selected.map((m) => (
                  <th key={m.code} className="p-2 align-bottom">
                    <div className="rounded-xl border border-stone-200 bg-white p-3 text-center">
                      <div className="text-[11px] text-stone-500">{m.pref}</div>
                      <Link
                        href={`/m/${m.code}`}
                        className="block font-bold text-stone-900 hover:text-amber-700"
                      >
                        {m.name}
                      </Link>
                      <div className="mt-1">
                        <ScoreBadge value={overall(m)} />
                      </div>
                      <Link
                        href={compareHref(codes.filter((c) => c !== m.code))}
                        className="mt-1 inline-block text-[11px] text-stone-400 hover:text-rose-600"
                      >
                        × 外す
                      </Link>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {/* スコア（高いほど良い → 最高値を強調） */}
              <tr>
                <td
                  colSpan={selected.length + 1}
                  className="sticky left-0 bg-stone-50 pt-4 pb-1 text-xs font-bold uppercase tracking-wider text-amber-700"
                >
                  スコア
                </td>
              </tr>
              {scoreRows.map((row) => {
                const vals = selected.map((m) => scoreValue(m, row.key));
                const best = Math.max(...vals);
                return (
                  <tr key={row.key} className="border-t border-stone-100">
                    <td className="sticky left-0 z-10 bg-stone-50 p-2 text-stone-600">{row.label}</td>
                    {selected.map((m, i) => (
                      <td
                        key={m.code}
                        className={`p-2 text-center tabular-nums ${
                          selected.length > 1 && vals[i] === best
                            ? "font-bold text-emerald-600"
                            : "text-stone-800"
                        }`}
                      >
                        {vals[i]}
                      </td>
                    ))}
                  </tr>
                );
              })}

              {/* 主要データ */}
              <tr>
                <td
                  colSpan={selected.length + 1}
                  className="sticky left-0 bg-stone-50 pt-4 pb-1 text-xs font-bold uppercase tracking-wider text-amber-700"
                >
                  主要データ
                </td>
              </tr>
              {metricRows.map((row) => (
                <tr key={row.label} className="border-t border-stone-100">
                  <td className="sticky left-0 z-10 bg-stone-50 p-2 text-stone-600">{row.label}</td>
                  {selected.map((m) => (
                    <td key={m.code} className="p-2 text-center tabular-nums text-stone-800">
                      {row.value(m)}
                    </td>
                  ))}
                </tr>
              ))}

              {/* ハザード */}
              <tr>
                <td
                  colSpan={selected.length + 1}
                  className="sticky left-0 bg-stone-50 pt-4 pb-1 text-xs font-bold uppercase tracking-wider text-amber-700"
                >
                  ハザード
                </td>
              </tr>
              {hazardKeys.map((k) => (
                <tr key={k} className="border-t border-stone-100">
                  <td className="sticky left-0 z-10 bg-stone-50 p-2 text-stone-600">
                    {HAZARD_LABELS[k]}
                  </td>
                  {selected.map((m) => (
                    <td key={m.code} className="p-2 text-center">
                      <HazardBadge label={HAZARD_LABELS[k]} level={m.hazards[k]} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* 街を追加 */}
      {rest.length > 0 && (
        <section className="mt-8">
          <p className="text-sm font-semibold text-stone-700">
            {codes.length >= MAX ? `比較は最大${MAX}件まで` : "街を追加する"}
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {rest.map((m) => {
              const full = codes.length >= MAX;
              return full ? (
                <span
                  key={m.code}
                  className="cursor-not-allowed rounded-full border border-stone-200 px-3 py-1.5 text-sm text-stone-300"
                >
                  {m.name}
                </span>
              ) : (
                <Link
                  key={m.code}
                  href={compareHref([...codes, m.code])}
                  className="rounded-full border border-stone-300 px-3 py-1.5 text-sm text-stone-700 hover:border-amber-400 hover:bg-amber-50"
                >
                  ＋ {m.name}
                </Link>
              );
            })}
          </div>
        </section>
      )}

      <footer className="mt-12 border-t border-stone-200 pt-6 text-xs text-stone-400">
        ※数値はデモ用のモックデータです。本番の出典：国交省 不動産情報ライブラリ／総務省 e-Stat／気象庁。
      </footer>
    </main>
  );
}
