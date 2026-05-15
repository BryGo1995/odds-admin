// web/src/components/MlbStatsTable.tsx
import type { MlbPlayerGameLogItem } from "@/api/client";

function formatStat(val: number | null): string {
  return val !== null ? String(val) : "—";
}

interface MlbStatsTableProps {
  logs: MlbPlayerGameLogItem[];
}

export function MlbStatsTable({ logs }: MlbStatsTableProps) {
  if (logs.length === 0) {
    return <p className="text-sm text-slate-500">No stats available for this season.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr>
            {[
              "Date", "Matchup", "PA", "AB", "H", "2B", "3B", "HR", "RBI", "R", "BB", "K", "SB", "TB",
            ].map((label) => (
              <th
                key={label}
                className="text-left px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500"
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
              <td className="px-2 py-1.5 text-slate-400">{formatStat(log.plate_appearances)}</td>
              <td className="px-2 py-1.5 text-slate-400">{formatStat(log.at_bats)}</td>
              <td className="px-2 py-1.5 text-slate-400">{formatStat(log.hits)}</td>
              <td className="px-2 py-1.5 text-slate-400">{formatStat(log.doubles)}</td>
              <td className="px-2 py-1.5 text-slate-400">{formatStat(log.triples)}</td>
              <td className="px-2 py-1.5 text-slate-400">{formatStat(log.home_runs)}</td>
              <td className="px-2 py-1.5 text-slate-400">{formatStat(log.rbi)}</td>
              <td className="px-2 py-1.5 text-slate-400">{formatStat(log.runs)}</td>
              <td className="px-2 py-1.5 text-slate-400">{formatStat(log.walks)}</td>
              <td className="px-2 py-1.5 text-slate-400">{formatStat(log.strikeouts)}</td>
              <td className="px-2 py-1.5 text-slate-400">{formatStat(log.stolen_bases)}</td>
              <td className="px-2 py-1.5 text-slate-400">{formatStat(log.total_bases)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
