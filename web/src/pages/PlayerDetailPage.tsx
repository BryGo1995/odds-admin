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
  MlbPlayerListItem,
  PlayerPropItem,
  PlayerGameLogItem,
  MlbPlayerGameLogItem,
} from "@/api/client";
import { useSport } from "@/lib/sport";
import { propTypeLabel } from "@/lib/propTypes";
import { NbaStatsTable, type StatCategory } from "@/components/NbaStatsTable";
import { MlbStatsTable } from "@/components/MlbStatsTable";

const NBA_SEASONS = ["2025-26", "2024-25", "2023-24"];
const MLB_SEASONS = ["2026", "2025", "2024"];
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

export function PlayerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const playerId = Number(id);
  const { sport } = useSport();

  const [player, setPlayer] = useState<PlayerListItem | MlbPlayerListItem | null>(null);
  const [props, setProps] = useState<PlayerPropItem[]>([]);
  const [nbaLogs, setNbaLogs] = useState<PlayerGameLogItem[]>([]);
  const [mlbLogs, setMlbLogs] = useState<MlbPlayerGameLogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const seasons = sport === "MLB" ? MLB_SEASONS : NBA_SEASONS;
  const [season, setSeason] = useState(seasons[0]);
  const [lastN, setLastN] = useState<number | null>(null);
  const [statCategory, setStatCategory] = useState<StatCategory>("all");

  // Reset season + logs when sport changes (different season formats per sport)
  useEffect(() => {
    setSeason(sport === "MLB" ? MLB_SEASONS[0] : NBA_SEASONS[0]);
    setStatCategory("all");
  }, [sport]);

  // Fetch player + props on player or sport change
  useEffect(() => {
    let isCurrent = true;
    setLoading(true);
    setError(null);
    Promise.all([
      fetchPlayer(playerId, sport),
      fetchPlayerProps(playerId, sport),
    ])
      .then(([playerData, propsData]) => {
        if (!isCurrent) return;
        setPlayer(playerData);
        setProps(propsData);
      })
      .catch((e) => { if (isCurrent) setError(e.message); })
      .finally(() => { if (isCurrent) setLoading(false); });
    return () => { isCurrent = false; };
  }, [playerId, sport]);

  // Fetch game logs on player, sport, or season change
  useEffect(() => {
    let isCurrent = true;
    fetchPlayerGameLogs(playerId, sport, season)
      .then((logs) => {
        if (!isCurrent) return;
        if (sport === "MLB") {
          setMlbLogs(logs as MlbPlayerGameLogItem[]);
          setNbaLogs([]);
        } else {
          setNbaLogs(logs as PlayerGameLogItem[]);
          setMlbLogs([]);
        }
      })
      .catch((e) => { if (isCurrent) setError(e.message); });
    return () => { isCurrent = false; };
  }, [playerId, sport, season]);

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

  // Apply lastN to whichever log array is active
  const displayedNbaLogs = lastN ? nbaLogs.slice(0, lastN) : nbaLogs;
  const displayedMlbLogs = lastN ? mlbLogs.slice(0, lastN) : mlbLogs;

  const isMlb = sport === "MLB";
  const mlbPlayer = isMlb ? (player as MlbPlayerListItem) : null;

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      <button
        onClick={() => navigate("/players")}
        className="text-sm text-slate-500 hover:text-slate-300 flex items-center gap-1 mb-4"
      >
        <ChevronLeft className="w-4 h-4" /> Players
      </button>

      <div className="mb-6">
        <h1 className="text-xl font-bold text-slate-100">{player.full_name}</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          {player.position ?? "—"} · {player.team_abbreviation ?? "—"}
          {mlbPlayer && (mlbPlayer.bats || mlbPlayer.throws) && (
            <span className="ml-3 text-slate-600">
              B/T: {mlbPlayer.bats ?? "—"}/{mlbPlayer.throws ?? "—"}
            </span>
          )}
        </p>
      </div>

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
                          {propTypeLabel(p.prop_type)}
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
                              : "text-red-400",
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

      <section>
        <p className="text-[11px] font-bold uppercase tracking-widest text-slate-500 pb-2 mb-3 border-b border-slate-800">
          Game Log
        </p>

        <div className="flex flex-wrap gap-3 mb-4 items-center">
          <div className="flex gap-1">
            {seasons.map((s) => (
              <button
                key={s}
                onClick={() => setSeason(s)}
                className={cn(
                  "text-[10px] font-bold tracking-wide px-2 py-1 rounded cursor-pointer",
                  season === s
                    ? "bg-blue-950 text-blue-400"
                    : "bg-slate-800 text-slate-500 hover:text-slate-400",
                )}
              >
                {s}
              </button>
            ))}
          </div>

          <span className="text-slate-700 text-xs">|</span>

          <div className="flex gap-1">
            <button
              onClick={() => setLastN(null)}
              className={cn(
                "text-[10px] font-bold tracking-wide px-2 py-1 rounded cursor-pointer",
                lastN === null
                  ? "bg-blue-950 text-blue-400"
                  : "bg-slate-800 text-slate-500 hover:text-slate-400",
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
                    : "bg-slate-800 text-slate-500 hover:text-slate-400",
                )}
              >
                L{n}
              </button>
            ))}
          </div>

          {!isMlb && (
            <>
              <span className="text-slate-700 text-xs">|</span>
              <div className="flex gap-1">
                {(["all", "pts", "reb", "ast"] as StatCategory[]).map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setStatCategory(cat)}
                    className={cn(
                      "text-[10px] font-bold tracking-wide px-2 py-1 rounded cursor-pointer",
                      statCategory === cat
                        ? "bg-blue-950 text-blue-400"
                        : "bg-slate-800 text-slate-500 hover:text-slate-400",
                    )}
                  >
                    {STAT_CATEGORY_LABELS[cat]}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        {isMlb
          ? <MlbStatsTable logs={displayedMlbLogs} />
          : <NbaStatsTable logs={displayedNbaLogs} statCategory={statCategory} />
        }
      </section>
    </div>
  );
}
