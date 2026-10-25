import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { fetchRecommendations, fetchTopRecommendations } from "@/api/client";
import type { PropRecommendationItem } from "@/api/client";
import { useSport } from "@/lib/sport";
import { propTypeLabel } from "@/lib/propTypes";

// ── helpers ───────────────────────────────────────────────────────────────────

// Local calendar date (YYYY-MM-DD). toISOString() is UTC, which rolls over to
// tomorrow in the evening in US timezones and shows an empty slate.
function toDateString(d: Date): string {
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${month}-${day}`;
}

function formatPct(val: number | null): string {
  if (val === null) return "—";
  const sign = val >= 0 ? "+" : "";
  return `${sign}${(val * 100).toFixed(1)}%`;
}

function formatProb(val: number | null): string {
  if (val === null) return "—";
  return `${(val * 100).toFixed(1)}%`;
}

// ── TopPicksModule ────────────────────────────────────────────────────────────

function TopPicksModule({
  picks,
  loading,
}: {
  picks: PropRecommendationItem[];
  loading: boolean;
}) {
  const slots = Array.from({ length: 5 }, (_, i) => picks[i] ?? null);

  return (
    <section className="mb-8">
      <p className="text-[11px] font-bold uppercase tracking-widest text-slate-500 pb-2 mb-3 border-b border-slate-800">
        Top Picks
      </p>
      {loading ? (
        <div className="grid grid-cols-5 gap-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="bg-slate-900 border border-slate-800 rounded-lg p-4 h-36 animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-5 gap-3">
          {slots.map((pick, i) =>
            pick ? (
              <div
                key={pick.id}
                className="bg-slate-900 border border-slate-800 rounded-lg p-4 flex flex-col gap-1"
              >
                <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wide">
                  #{pick.rank}
                </span>
                <p className="text-sm font-semibold text-slate-100 leading-tight">
                  {pick.player_name ?? "—"}
                </p>
                <p className="text-xs text-violet-400">
                  {propTypeLabel(pick.prop_type)}
                </p>
                <p className="text-xs text-blue-400 font-semibold">
                  {pick.outcome} {pick.line ?? "—"}
                </p>
                <p className="text-xs text-slate-500">{pick.bookmaker ?? "—"}</p>
                <p className="text-sm font-bold text-green-400 mt-1">
                  {formatPct(pick.edge)}
                </p>
                <p className="text-[10px] text-slate-600">
                  {pick.model_version ?? ""}
                </p>
              </div>
            ) : (
              <div
                key={`empty-${i}`}
                className="bg-slate-900/40 border border-slate-800/50 rounded-lg p-4 flex items-center justify-center"
              >
                <span className="text-slate-700 text-sm">—</span>
              </div>
            )
          )}
        </div>
      )}
    </section>
  );
}

// ── RecommendationsTable ──────────────────────────────────────────────────────

type SortKey = keyof PropRecommendationItem;
type SortDir = "asc" | "desc";

function RecommendationsTable({
  rows,
  loading,
}: {
  rows: PropRecommendationItem[];
  loading: boolean;
}) {
  const [propTypeFilter, setPropTypeFilter] = useState("all");
  const [bookmakerFilter, setBookmakerFilter] = useState("all");
  const [sortKey, setSortKey] = useState<SortKey>("rank");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  const propTypes = ["all", ...Array.from(
    new Set(rows.map((r) => r.prop_type).filter((t): t is string => t !== null))
  ).sort()];
  const bookmakers = ["all", ...Array.from(
    new Set(rows.map((r) => r.bookmaker).filter((b): b is string => b !== null))
  ).sort()];

  const filtered = rows.filter((r) => {
    if (propTypeFilter !== "all" && r.prop_type !== propTypeFilter) return false;
    if (bookmakerFilter !== "all" && r.bookmaker !== bookmakerFilter) return false;
    return true;
  });

  const sorted = [...filtered].sort((a, b) => {
    const av = a[sortKey];
    const bv = b[sortKey];
    if (av === null || av === undefined) return 1;
    if (bv === null || bv === undefined) return -1;
    const cmp = av < bv ? -1 : av > bv ? 1 : 0;
    return sortDir === "asc" ? cmp : -cmp;
  });

  function toggleSort(key: SortKey) {
    if (key === sortKey) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  function SortIndicator({ col }: { col: SortKey }) {
    if (col !== sortKey) return <span className="text-slate-700 ml-1">↕</span>;
    return <span className="text-blue-400 ml-1">{sortDir === "asc" ? "↑" : "↓"}</span>;
  }

  const cols: { label: string; key: SortKey }[] = [
    { label: "Rank", key: "rank" },
    { label: "Player", key: "player_name" },
    { label: "Prop Type", key: "prop_type" },
    { label: "Line", key: "line" },
    { label: "Outcome", key: "outcome" },
    { label: "Bookmaker", key: "bookmaker" },
    { label: "Edge", key: "edge" },
    { label: "Model Prob", key: "model_prob" },
    { label: "Impl. Prob", key: "implied_prob" },
    { label: "Model Ver.", key: "model_version" },
  ];

  return (
    <section>
      <p className="text-[11px] font-bold uppercase tracking-widest text-slate-500 pb-2 mb-3 border-b border-slate-800">
        All Recommendations
      </p>

      <div className="flex gap-3 mb-4">
        <select
          value={propTypeFilter}
          onChange={(e) => setPropTypeFilter(e.target.value)}
          className="px-3 py-1.5 bg-slate-800 border border-slate-700 rounded text-sm text-slate-300 focus:outline-none focus:border-blue-400"
        >
          {propTypes.map((t) => (
            <option key={t} value={t}>
              {t === "all" ? "All Prop Types" : propTypeLabel(t)}
            </option>
          ))}
        </select>

        <select
          value={bookmakerFilter}
          onChange={(e) => setBookmakerFilter(e.target.value)}
          className="px-3 py-1.5 bg-slate-800 border border-slate-700 rounded text-sm text-slate-300 focus:outline-none focus:border-blue-400"
        >
          {bookmakers.map((b) => (
            <option key={b} value={b}>
              {b === "all" ? "All Bookmakers" : b}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <p className="text-slate-500 text-sm">Loading...</p>
      ) : sorted.length === 0 ? (
        <p className="text-slate-500 text-sm">No recommendations for this date.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr>
                {cols.map(({ label, key }) => (
                  <th
                    key={key}
                    onClick={() => toggleSort(key)}
                    className="text-left px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500 cursor-pointer hover:text-slate-300 select-none whitespace-nowrap"
                  >
                    {label}
                    <SortIndicator col={key} />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sorted.map((row) => (
                <tr key={row.id} className="border-t border-slate-800 hover:bg-slate-900/50">
                  <td className="px-2 py-1.5 text-slate-400">{row.rank ?? "—"}</td>
                  <td className="px-2 py-1.5 text-slate-100 font-medium whitespace-nowrap">{row.player_name ?? "—"}</td>
                  <td className="px-2 py-1.5 text-violet-400">{propTypeLabel(row.prop_type)}</td>
                  <td className="px-2 py-1.5 text-blue-400 font-semibold">{row.line ?? "—"}</td>
                  <td className="px-2 py-1.5 text-slate-400">{row.outcome ?? "—"}</td>
                  <td className="px-2 py-1.5 text-slate-300">{row.bookmaker ?? "—"}</td>
                  <td className="px-2 py-1.5 font-semibold text-green-400">{formatPct(row.edge)}</td>
                  <td className="px-2 py-1.5 text-slate-400">{formatProb(row.model_prob)}</td>
                  <td className="px-2 py-1.5 text-slate-400">{formatProb(row.implied_prob)}</td>
                  <td className="px-2 py-1.5 text-slate-600">{row.model_version ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

// ── RecommendationsPage ───────────────────────────────────────────────────────

export function RecommendationsPage() {
  const today = toDateString(new Date());
  const { sport } = useSport();
  const [date, setDate] = useState(today);
  const [topPicks, setTopPicks] = useState<PropRecommendationItem[]>([]);
  const [allRecs, setAllRecs] = useState<PropRecommendationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isCurrent = true;
    setLoading(true);
    setError(null);
    Promise.all([
      fetchTopRecommendations(date, sport),
      fetchRecommendations(date, sport),
    ])
      .then(([top, all]) => {
        if (!isCurrent) return;
        setTopPicks(top);
        setAllRecs(all);
      })
      .catch((e) => { if (isCurrent) setError(e.message); })
      .finally(() => { if (isCurrent) setLoading(false); });
    return () => { isCurrent = false; };
  }, [date, sport]);

  function prevDay() {
    const d = new Date(date + "T00:00:00");
    d.setDate(d.getDate() - 1);
    setDate(toDateString(d));
  }

  function nextDay() {
    const d = new Date(date + "T00:00:00");
    d.setDate(d.getDate() + 1);
    setDate(toDateString(d));
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      {/* Date navigation */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={prevDay}
          className="p-1 text-slate-400 hover:text-slate-100 transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <span className="text-slate-100 font-semibold text-sm tabular-nums">{date}</span>
        <button
          onClick={nextDay}
          disabled={date >= today}
          className={cn(
            "p-1 transition-colors",
            date >= today
              ? "text-slate-700 cursor-not-allowed"
              : "text-slate-400 hover:text-slate-100"
          )}
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {error && (
        <p className="text-red-400 text-sm mb-6">Failed to load recommendations: {error}</p>
      )}

      <TopPicksModule picks={topPicks} loading={loading} />
      <RecommendationsTable rows={allRecs} loading={loading} />
    </div>
  );
}
