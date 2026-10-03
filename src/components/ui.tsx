import type { ReactNode } from "react";

export function ScoreBar({ label, value }: { label: string; value: number }) {
  const color = value >= 70 ? "bg-emerald-500" : value >= 50 ? "bg-amber-500" : "bg-rose-500";
  return (
    <div>
      <div className="mb-1 flex justify-between text-sm">
        <span className="text-stone-600">{label}</span>
        <span className="font-semibold tabular-nums text-stone-900">{value}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-stone-200">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}

const hazardStyle = (lvl: number) =>
  lvl <= 0
    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
    : lvl >= 3
    ? "bg-rose-50 text-rose-700 border-rose-200"
    : "bg-amber-50 text-amber-700 border-amber-200";
const hazardWord = (lvl: number) => (lvl <= 0 ? "低" : lvl >= 3 ? "高" : "中");

export function HazardBadge({ label, level }: { label: string; level: number }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm ${hazardStyle(level)}`}>
      <span className="font-medium">{label}</span>
      <span className="font-bold">{hazardWord(level)}</span>
    </span>
  );
}

export function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-xl border border-stone-200 bg-white p-4">
      <div className="text-xs tracking-wide text-stone-500">{label}</div>
      <div className="mt-1 text-lg font-semibold tabular-nums text-stone-900">{value}</div>
      {sub && <div className="mt-0.5 text-xs text-stone-500">{sub}</div>}
    </div>
  );
}

export function Section({ kicker, title, children }: { kicker?: string; title: string; children: ReactNode }) {
  return (
    <section className="mt-10">
      {kicker && <p className="text-xs font-bold uppercase tracking-[0.2em] text-amber-700">{kicker}</p>}
      <h2 className="mt-1 text-xl font-bold text-stone-900">{title}</h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

export function ScoreBadge({ value, size = "md" }: { value: number; size?: "md" | "lg" }) {
  const color = value >= 70 ? "text-emerald-600" : value >= 50 ? "text-amber-600" : "text-rose-600";
  const cls = size === "lg" ? "text-5xl" : "text-2xl";
  return <span className={`font-bold tabular-nums ${cls} ${color}`}>{value}</span>;
}
