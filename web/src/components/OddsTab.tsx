import { useState } from "react";
import { cn } from "@/lib/utils";
import type { OddsItem } from "@/api/client";

type MarketFilter = "h2h" | "spreads" | "totals";

const MARKET_LABELS: Record<MarketFilter, string> = {
  h2h: "H2H",
  spreads: "Spreads",
  totals: "Totals",
};

function formatPrice(price: number | null): string {
  if (price === null) return "—";
  return price > 0 ? `+${price}` : String(price);
}

function formatLastUpdate(ts: string | null): string {
  if (!ts) return "—";
  const diff = Math.floor((Date.now() - new Date(ts).getTime()) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  return new Date(ts).toLocaleTimeString();
}

interface OddsTabProps {
  odds: OddsItem[];
}

export function OddsTab({ odds }: OddsTabProps) {
  const [filter, setFilter] = useState<MarketFilter>("h2h");

  const filtered = odds.filter((o) => o.market_type === filter);

  return (
    <div className="py-2">
      <div className="flex gap-2 px-4 pb-3">
        {(["h2h", "spreads", "totals"] as MarketFilter[]).map((m) => (
          <button
            key={m}
            onClick={() => setFilter(m)}
            className={cn(
              "text-[10px] font-bold tracking-wide px-2 py-1 rounded cursor-pointer",
              filter === m
                ? "bg-blue-950 text-blue-400"
                : "bg-slate-800 text-slate-500 hover:text-slate-400"
            )}
          >
            {MARKET_LABELS[m]}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <p className="px-4 py-3 text-sm text-slate-500">No odds available.</p>
      ) : (
        <table className="w-full text-xs">
          <thead>
            <tr>
              {["Bookmaker", "Outcome", "Price", "Last Update"].map((h) => (
                <th
                  key={h}
                  className="text-left px-4 py-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((o, i) => (
              <tr key={i} className="border-t border-slate-900 hover:bg-slate-900/50">
                <td className="px-4 py-2 text-slate-200 font-medium">{o.bookmaker}</td>
                <td className="px-4 py-2 text-slate-400">{o.outcome_name}</td>
                <td
                  className={cn(
                    "px-4 py-2 font-semibold",
                    o.price !== null && o.price > 0 ? "text-green-400" : "text-red-400"
                  )}
                >
                  {formatPrice(o.price)}
                </td>
                <td className="px-4 py-2 text-slate-500">
                  {formatLastUpdate(o.last_update)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
