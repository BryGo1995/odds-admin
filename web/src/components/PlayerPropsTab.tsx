import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { propTypeLabel } from "@/lib/propTypes";
import { useSport } from "@/lib/sport";
import type { PlayerPropItem } from "@/api/client";

const NBA_PROP_TYPES = ["player_points", "player_rebounds", "player_assists"];
const MLB_PROP_TYPES = ["batter_hits", "batter_total_bases"];

function groupByPlayer(props: PlayerPropItem[]): Map<string, PlayerPropItem[]> {
  const map = new Map<string, PlayerPropItem[]>();
  for (const p of props) {
    const name = p.player_name ?? "Unknown";
    if (!map.has(name)) map.set(name, []);
    map.get(name)!.push(p);
  }
  return map;
}

interface PlayerPropsTabProps {
  props: PlayerPropItem[];
}

export function PlayerPropsTab({ props }: PlayerPropsTabProps) {
  const { sport } = useSport();
  const propTypeOptions = useMemo(
    () => (sport === "MLB" ? MLB_PROP_TYPES : NBA_PROP_TYPES),
    [sport],
  );

  const [filter, setFilter] = useState<string>("all");

  // Reset filter when sport changes so we don't keep an invalid prop_type selected
  useMemo(() => setFilter("all"), [sport]);

  const filtered =
    filter === "all" ? props : props.filter((p) => p.prop_type === filter);

  const grouped = groupByPlayer(filtered);

  const buttons: { value: string; label: string }[] = [
    { value: "all", label: "All" },
    ...propTypeOptions.map((pt) => ({ value: pt, label: propTypeLabel(pt) })),
  ];

  return (
    <div className="py-2">
      <div className="flex gap-2 px-4 pb-3">
        {buttons.map((b) => (
          <button
            key={b.value}
            onClick={() => setFilter(b.value)}
            className={cn(
              "text-[10px] font-bold tracking-wide px-2 py-1 rounded cursor-pointer",
              filter === b.value
                ? "bg-blue-950 text-blue-400"
                : "bg-slate-800 text-slate-500 hover:text-slate-400"
            )}
          >
            {b.label}
          </button>
        ))}
      </div>

      {grouped.size === 0 ? (
        <p className="px-4 py-3 text-sm text-slate-500">No player props available.</p>
      ) : (
        <div className="flex flex-col gap-3 px-4 pb-3">
          {Array.from(grouped.entries()).map(([player, playerProps]) => (
            <div key={player}>
              <p className="text-[13px] font-bold text-slate-200 mb-2 pb-1 border-b border-slate-800">
                {player}
              </p>
              <table className="w-full text-xs">
                <thead>
                  <tr>
                    {["Bookmaker", "Prop", "Line", "Outcome", "Price"].map((h) => (
                      <th
                        key={h}
                        className="text-left px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {playerProps.map((p, i) => (
                    <tr key={i} className="border-t border-slate-900">
                      <td className="px-2 py-1.5 text-slate-300 font-medium">{p.bookmaker}</td>
                      <td className="px-2 py-1.5 text-violet-400 font-semibold">
                        {propTypeLabel(p.prop_type)}
                      </td>
                      <td className="px-2 py-1.5 text-blue-400 font-semibold">
                        {p.point ?? "—"}
                      </td>
                      <td className="px-2 py-1.5 text-slate-400">{p.outcome}</td>
                      <td
                        className={cn(
                          "px-2 py-1.5 font-semibold",
                          p.price !== null && p.price > 0
                            ? "text-green-400"
                            : "text-red-400"
                        )}
                      >
                        {p.price !== null
                          ? p.price > 0
                            ? `+${p.price}`
                            : String(p.price)
                          : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
