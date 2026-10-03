import Link from "next/link";
import { municipalities, overall, scores, SCORE_LABELS, yen } from "@/lib/data";
import { ScoreBadge } from "@/components/ui";

export default function Home() {
  const list = [...municipalities].sort((a, b) => overall(b) - overall(a));

  return (
    <main className="mx-auto w-full max-w-4xl px-5 py-12">
      <header>
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-amber-700">街の通信簿</p>
        <h1 className="mt-2 text-3xl font-bold text-stone-900 sm:text-4xl">住む街を、データで選ぶ。</h1>
        <p className="mt-3 max-w-xl text-stone-600">
          人口・地価・取引価格・ハザード・施設・気候——国の公開データで、引っ越し先の“通信簿”を見比べる。
        </p>
        <p className="mt-3 inline-block rounded bg-stone-100 px-2 py-1 text-[11px] text-stone-500">
          ※現在はデモ用のモックデータ（実データは国交省 不動産情報ライブラリ／e-Stat／気象庁から取り込み予定）
        </p>
        <div className="mt-4">
          <Link
            href="/compare?m=13112,14100,12220"
            className="inline-flex items-center gap-1 text-sm font-semibold text-amber-700 hover:text-amber-800"
          >
            ▶ 人気の3都市をくらべてみる
          </Link>
        </div>
      </header>

      <div className="mt-10 grid gap-4 sm:grid-cols-2">
        {list.map((m) => {
          const s = scores(m);
          return (
            <Link
              key={m.code}
              href={`/m/${m.code}`}
              className="group rounded-2xl border border-stone-200 bg-white p-5 transition hover:border-stone-300 hover:shadow-sm"
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs text-stone-500">{m.pref}</p>
                  <h2 className="text-xl font-bold text-stone-900 group-hover:text-amber-700">{m.name}</h2>
                </div>
                <div className="text-right">
                  <p className="text-[10px] text-stone-400">総合</p>
                  <ScoreBadge value={overall(m)} />
                </div>
              </div>
              <p className="mt-2 line-clamp-2 text-sm text-stone-600">{m.blurb}</p>
              <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-stone-500">
                <span>人口 {yen(m.population)}</span>
                <span>地価 {yen(m.landPrice)}円/m²</span>
                <span>家賃 {m.rentAvg}万</span>
              </div>
              <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-stone-500">
                {(Object.keys(s) as (keyof typeof s)[]).map((k) => (
                  <span key={k}>
                    {SCORE_LABELS[k]} <b className="text-stone-800 tabular-nums">{s[k]}</b>
                  </span>
                ))}
              </div>
            </Link>
          );
        })}
      </div>

      <footer className="mt-12 border-t border-stone-200 pt-6 text-xs text-stone-400">
        街の通信簿（デモ）｜本番の出典：国交省 不動産情報ライブラリ／総務省 e-Stat／気象庁
      </footer>
    </main>
  );
}
