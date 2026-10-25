// web/src/components/NbaStatsTable.tsx
import { cn } from "@/lib/utils";
import type { PlayerGameLogItem } from "@/api/client";

type StatCategory = "all" | "pts" | "reb" | "ast";

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

interface NbaStatsTableProps {
  logs: PlayerGameLogItem[];
  statCategory: StatCategory;
}

export function NbaStatsTable({ logs, statCategory }: NbaStatsTableProps) {
  const highlightCol = (col: StatCategory): string =>
    statCategory !== "all" && statCategory === col
      ? "bg-blue-950/40 text-blue-300 font-semibold"
      : "";

  if (logs.length === 0) {
    return <p className="text-sm text-slate-500">No stats available for this season.</p>;
  }

  return (
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
                  col && statCategory === col ? "text-blue-400" : "",
                )}
              >
                {label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {logs.map((log, i) => (
            <tr key={i} className="border-t border-slate-800 hover:bg-slate-900/50">
              <td className="px-2 py-1.5 text-slate-400">{log.game_date}</td>
              <td className="px-2 py-1.5 text-slate-300">{log.matchup ?? "—"}</td>
              <td
                className={cn(
                  "px-2 py-1.5 font-semibold",
                  log.wl === "W" ? "text-green-400" : log.wl === "L" ? "text-red-400" : "text-slate-500",
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
                    : "text-slate-400",
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
  );
}

export type { StatCategory };
