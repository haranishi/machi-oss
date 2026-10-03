import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getMunicipality,
  municipalities,
  scores,
  overall,
  SCORE_LABELS,
  HAZARD_LABELS,
  SOURCES,
  yen,
  type Hazard,
} from "@/lib/data";
import { ScoreBar, HazardBadge, Stat, Section, ScoreBadge } from "@/components/ui";

export function generateStaticParams() {
  return municipalities.map((m) => ({ code: m.code }));
}

export async function generateMetadata({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const m = getMunicipality(code);
  if (!m) return { title: "見つかりませんでした｜街の通信簿" };
  return {
    title: `${m.pref}${m.name}の住みやすさ・通信簿｜街の通信簿`,
    description: `${m.pref}${m.name}の人口・地価・取引価格・ハザード・施設・気候を公的データでまとめた“通信簿”。総合スコア${overall(m)}。引っ越し・住まい選びの比較に。`,
  };
}

export default async function Page({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const m = getMunicipality(code);
  if (!m) notFound();
  const s = scores(m);

  return (
    <main className="mx-auto max-w-3xl px-5 py-10">
      <Link href="/" className="text-sm text-stone-500 hover:text-stone-800">
        ← 街をさがす
      </Link>

      <div className="mt-3 flex items-end justify-between gap-4">
        <div>
          <p className="text-sm text-stone-500">
            {m.pref}・{m.region}
          </p>
          <h1 className="text-3xl font-bold text-stone-900">{m.name}</h1>
          <p className="mt-2 max-w-md text-stone-600">{m.blurb}</p>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-xs text-stone-500">総合スコア</p>
          <ScoreBadge value={overall(m)} size="lg" />
        </div>
      </div>

      <div className="mt-4">
        <Link
          href={`/compare?m=${m.code}`}
          className="inline-flex items-center gap-1 rounded-md border border-stone-300 px-3 py-1.5 text-sm font-semibold text-stone-700 hover:border-amber-400 hover:bg-amber-50"
        >
          ＋ この街を比較に追加
        </Link>
      </div>

      <Section kicker="Scores" title="4つの軸でみる">
        <div className="grid gap-4 sm:grid-cols-2">
          {(Object.keys(s) as (keyof typeof s)[]).map((k) => (
            <ScoreBar key={k} label={SCORE_LABELS[k]} value={s[k]} />
          ))}
        </div>
      </Section>

      <Section kicker="People" title="人口・世帯">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="人口" value={`${yen(m.population)}人`} />
          <Stat label="世帯数" value={yen(m.households)} />
          <Stat label="人口増減" value={`${m.popTrend >= 0 ? "+" : ""}${m.popTrend}%`} sub="直近・年率" />
          <Stat label="高齢化率" value={`${m.aging}%`} />
        </div>
      </Section>

      <Section kicker="Price" title="地価・住まいのコスト">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="公示地価(平均)" value={`${yen(m.landPrice)}円/m²`} sub={`${m.landPriceTrend >= 0 ? "+" : ""}${m.landPriceTrend}%`} />
          <Stat label="中古マンション" value={`${yen(m.txPriceAvg)}万円`} sub="取引平均(参考)" />
          <Stat label="家賃(1LDK)" value={`${m.rentAvg}万円`} sub="参考" />
        </div>
      </Section>

      <Section kicker="Hazard" title="ハザード（防災）">
        <div className="flex flex-wrap gap-2">
          {(Object.keys(m.hazards) as (keyof Hazard)[]).map((k) => (
            <HazardBadge key={k} label={HAZARD_LABELS[k]} level={m.hazards[k]} />
          ))}
        </div>
        <p className="mt-3 text-xs text-stone-500">
          ※リスクの目安です。実際の自宅の位置は各自治体のハザードマップで必ずご確認ください。
        </p>
      </Section>

      <Section kicker="Facilities & Climate" title="施設・気候">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="学校" value={yen(m.facilities.school)} />
          <Stat label="病院" value={yen(m.facilities.hospital)} />
          <Stat label="保育施設" value={yen(m.facilities.daycare)} />
          <Stat label="公園" value={yen(m.facilities.park)} />
          <Stat label="スーパー" value={yen(m.facilities.supermarket)} />
          <Stat label="平均気温" value={`${m.climate.avgTemp}℃`} />
          <Stat label="晴れの日" value={`${m.climate.sunnyDays}日/年`} />
          <Stat label="雪" value={m.climate.snowy ? "多い" : "少ない"} />
        </div>
      </Section>

      <div className="mt-10 rounded-2xl border border-amber-200 bg-amber-50 p-6 text-center">
        <p className="font-bold text-stone-900">{m.name}で住まいをさがす</p>
        <p className="mt-1 text-sm text-stone-600">この街の賃貸・物件を見る（外部サイトへ）</p>
        <a href="#" className="mt-4 inline-flex rounded-md bg-stone-900 px-6 py-3 text-sm font-bold text-white">
          物件をさがす（準備中）
        </a>
        <p className="mt-2 text-[11px] text-stone-400">※外部ECへの送客（アフィリエイト）予定。リンクは準備中。</p>
      </div>

      <footer className="mt-12 space-y-1 border-t border-stone-200 pt-6 text-xs text-stone-400">
        <p>
          ※本ページは<strong>デモ用のモックデータ</strong>です。数値は仮置きで、実データではありません。
        </p>
        <p>
          本番の出典（予定）：{SOURCES.price}／{SOURCES.stats}／{SOURCES.weather}。
        </p>
      </footer>
    </main>
  );
}
