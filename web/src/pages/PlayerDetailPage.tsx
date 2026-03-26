import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ChevronLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  fetchPlayer,
  fetchPlayerProps,
  fetchPlayerGameLogs,
} from "@/api/client";
import type {
  PlayerListItem,
  PlayerPropItem,
  PlayerGameLogItem,
} from "@/api/client";

type StatCategory = "all" | "pts" | "reb" | "ast";

const SEASONS = ["2025-26", "2024-25", "2023-24"];
const LAST_N_OPTIONS = [5, 10, 20] as const;

const STAT_CATEGORY_LABELS: Record<StatCategory, string> = {
  all: "All",
  pts: "Points",
  reb: "Rebounds",
  ast: "Assists",
};

function groupPropsByBookmaker(
  props: PlayerPropItem[]
): Map<string, PlayerPropItem[]> {
  const map = new Map<string, PlayerPropItem[]>();
  for (const p of props) {
    const bk = p.bookmaker ?? "Unknown";
    if (!map.has(bk)) map.set(bk, []);
    map.get(bk)!.push(p);
  }
  return map;
}

function formatPrice(price: number | null): string {
  if (price === null) return "—";
  return price > 0 ? `+${price}` : String(price);
}

function formatStat(val: number | null): string {
  return val !== null ? String(val) : "—";
}

function formatMin(val: number | null): string {
  if (val === null) return "—";
  return val.toFixed(1);
}

function formatUsg(val: number | null): string {
  if (val === null) return "—";
  return `${(val * 100).toFixed(1)}%`;
}

export function PlayerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const playerId = Number(id);

  const [player, setPlayer] = useState<PlayerListItem | null>(null);
  const [props, setProps] = useState<PlayerPropItem[]>([]);
  const [gameLogs, setGameLogs] = useState<PlayerGameLogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [season, setSeason] = useState("2025-26");
  const [lastN, setLastN] = useState<number | null>(null);
  const [statCategory, setStatCategory] = useState<StatCategory>("all");

  useEffect(() => {
    setLoading(true);
    Promise.all([
      fetchPlayer(playerId),
      fetchPlayerProps(playerId),
      fetchPlayerGameLogs(playerId, season),
    ])
      .then(([playerData, propsData, logsData]) => {
        setPlayer(playerData);
        setProps(propsData);
        setGameLogs(logsData);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [playerId]);

  // Re-fetch game logs when season changes
  useEffect(() => {
    if (!player) return;
    fetchPlayerGameLogs(playerId, season)
      .then(setGameLogs)
      .catch((e) => setError(e.message));
  }, [season]);

  if (loading) {
    return <p className="px-6 py-8 text-slate-500">Loading...</p>;
  }
  if (error || !player) {
    return (
      <div className="px-6 py-8">
        <p className="text-red-400 mb-3">{error ?? "Player not found."}</p>
        <button
          onClick={() => navigate("/players")}
          className="text-sm text-blue-400 hover:text-blue-300 flex items-center gap-1"
        >
          <ChevronLeft className="w-4 h-4" /> Back to Players
        </button>
      </div>
    );
  }

  const propsByBookmaker = groupPropsByBookmaker(props);
  const displayedLogs = lastN ? gameLogs.slice(0, lastN) : gameLogs;

  const highlightCol = (col: StatCategory): string =>
    statCategory !== "all" && statCategory === col
      ? "bg-blue-950/40 text-blue-300 font-semibold"
      : "";

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      {/* Back link */}
      <button
        onClick={() => navigate("/players")}
        className="text-sm text-slate-500 hover:text-slate-300 flex items-center gap-1 mb-4"
      >
        <ChevronLeft className="w-4 h-4" /> Players
      </button>

      {/* Player header */}
      <div className="mb-6">
        <h1 className="text-xl font-bold text-slate-100">{player.full_name}</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          {player.position ?? "—"} · {player.team_abbreviation ?? "—"}
        </p>
      </div>

      {/* Bookmaker prop cards */}
      <section className="mb-8">
        <p className="text-[11px] font-bold uppercase tracking-widest text-slate-500 pb-2 mb-3 border-b border-slate-800">
          Lines by Bookmaker
        </p>
        {propsByBookmaker.size === 0 ? (
          <p className="text-sm text-slate-500">No props available.</p>
        ) : (
          <div className="flex flex-wrap gap-3">
            {Array.from(propsByBookmaker.entries()).map(([bookmaker, bkProps]) => (
              <div
                key={bookmaker}
                className="bg-slate-900 border border-slate-800 rounded-lg p-4 min-w-[200px]"
              >
                <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400 mb-3">
                  {bookmaker}
                </p>
                <table className="w-full text-xs">
                  <thead>
                    <tr>
                      {["Prop", "Line", "Side", "Price"].map((h) => (
                        <th
                          key={h}
                          className="text-left pr-3 pb-1 text-[10px] uppercase tracking-wide text-slate-600"
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {bkProps.map((p, i) => (
                      <tr key={i} className="border-t border-slate-800">
                        <td className="pr-3 py-1.5 text-violet-400 font-semibold">
                          {p.prop_type?.replace("player_", "") ?? "—"}
                        </td>
                        <td className="pr-3 py-1.5 text-blue-400 font-semibold">
                          {p.point ?? "—"}
                        </td>
                        <td className="pr-3 py-1.5 text-slate-400">{p.outcome}</td>
                        <td
                          className={cn(
                            "py-1.5 font-semibold",
                            p.price !== null && p.price > 0
                              ? "text-green-400"
                              : "text-red-400"
                          )}
                        >
                          {formatPrice(p.price)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Stats section */}
      <section>
        <p className="text-[11px] font-bold uppercase tracking-widest text-slate-500 pb-2 mb-3 border-b border-slate-800">
          Game Log
        </p>

        {/* Filter bar */}
        <div className="flex flex-wrap gap-3 mb-4 items-center">
          {/* Season selector */}
          <div className="flex gap-1">
            {SEASONS.map((s) => (
              <button
                key={s}
                onClick={() => setSeason(s)}
                className={cn(
                  "text-[10px] font-bold tracking-wide px-2 py-1 rounded cursor-pointer",
                  season === s
                    ? "bg-blue-950 text-blue-400"
                    : "bg-slate-800 text-slate-500 hover:text-slate-400"
                )}
              >
                {s}
              </button>
            ))}
          </div>

          {/* Divider */}
          <span className="text-slate-700 text-xs">|</span>

          {/* Last N selector */}
          <div className="flex gap-1">
            <button
              onClick={() => setLastN(null)}
              className={cn(
                "text-[10px] font-bold tracking-wide px-2 py-1 rounded cursor-pointer",
                lastN === null
                  ? "bg-blue-950 text-blue-400"
                  : "bg-slate-800 text-slate-500 hover:text-slate-400"
              )}
            >
              All
            </button>
            {LAST_N_OPTIONS.map((n) => (
              <button
                key={n}
                onClick={() => setLastN(n)}
                className={cn(
                  "text-[10px] font-bold tracking-wide px-2 py-1 rounded cursor-pointer",
                  lastN === n
                    ? "bg-blue-950 text-blue-400"
                    : "bg-slate-800 text-slate-500 hover:text-slate-400"
                )}
              >
                L{n}
              </button>
            ))}
          </div>

          {/* Divider */}
          <span className="text-slate-700 text-xs">|</span>

          {/* Stat category */}
          <div className="flex gap-1">
            {(["all", "pts", "reb", "ast"] as StatCategory[]).map((cat) => (
              <button
                key={cat}
                onClick={() => setStatCategory(cat)}
                className={cn(
                  "text-[10px] font-bold tracking-wide px-2 py-1 rounded cursor-pointer",
                  statCategory === cat
                    ? "bg-blue-950 text-blue-400"
                    : "bg-slate-800 text-slate-500 hover:text-slate-400"
                )}
              >
                {STAT_CATEGORY_LABELS[cat]}
              </button>
            ))}
          </div>
        </div>

        {/* Stats table */}
        {displayedLogs.length === 0 ? (
          <p className="text-sm text-slate-500">No stats available for this season.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr>
                  {[
                    { label: "Date", col: null },
                    { label: "Matchup", col: null },
                    { label: "W/L", col: null },
                    { label: "MIN", col: null },
                    { label: "PTS", col: "pts" as StatCategory },
                    { label: "REB", col: "reb" as StatCategory },
                    { label: "AST", col: "ast" as StatCategory },
                    { label: "BLK", col: null },
                    { label: "STL", col: null },
                    { label: "USG%", col: null },
                    { label: "+/-", col: null },
                  ].map(({ label, col }) => (
                    <th
                      key={label}
                      className={cn(
                        "text-left px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500",
                        col && statCategory === col ? "text-blue-400" : ""
                      )}
                    >
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {displayedLogs.map((log, i) => (
                  <tr key={i} className="border-t border-slate-800 hover:bg-slate-900/50">
                    <td className="px-2 py-1.5 text-slate-400">{log.game_date}</td>
                    <td className="px-2 py-1.5 text-slate-300">{log.matchup ?? "—"}</td>
                    <td
                      className={cn(
                        "px-2 py-1.5 font-semibold",
                        log.wl === "W" ? "text-green-400" : log.wl === "L" ? "text-red-400" : "text-slate-500"
                      )}
                    >
                      {log.wl ?? "—"}
                    </td>
                    <td className="px-2 py-1.5 text-slate-400">{formatMin(log.min)}</td>
                    <td className={cn("px-2 py-1.5", highlightCol("pts"))}>{formatStat(log.pts)}</td>
                    <td className={cn("px-2 py-1.5", highlightCol("reb"))}>{formatStat(log.reb)}</td>
                    <td className={cn("px-2 py-1.5", highlightCol("ast"))}>{formatStat(log.ast)}</td>
                    <td className="px-2 py-1.5 text-slate-400">{formatStat(log.blk)}</td>
                    <td className="px-2 py-1.5 text-slate-400">{formatStat(log.stl)}</td>
                    <td className="px-2 py-1.5 text-slate-400">{formatUsg(log.usg_pct)}</td>
                    <td
                      className={cn(
                        "px-2 py-1.5 font-semibold",
                        log.plus_minus !== null && log.plus_minus > 0
                          ? "text-green-400"
                          : log.plus_minus !== null && log.plus_minus < 0
                          ? "text-red-400"
                          : "text-slate-400"
                      )}
                    >
                      {log.plus_minus !== null
                        ? log.plus_minus > 0
                          ? `+${log.plus_minus}`
                          : String(log.plus_minus)
                        : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
