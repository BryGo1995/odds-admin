import { useState } from "react";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { StatusBadge, deriveStatus } from "./StatusBadge";
import { OddsTab } from "./OddsTab";
import { PlayerPropsTab } from "./PlayerPropsTab";
import { ScoreTab } from "./ScoreTab";
import { fetchOdds, fetchProps, fetchScore } from "@/api/client";
import type { Game, OddsItem, PlayerPropItem, ScoreItem } from "@/api/client";

type Tab = "odds" | "props" | "score";

interface GameCardProps {
  game: Game;
}

export function GameCard({ game }: GameCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>("odds");
  const [odds, setOdds] = useState<OddsItem[] | null>(null);
  const [props, setProps] = useState<PlayerPropItem[] | null>(null);
  const [score, setScore] = useState<ScoreItem | null | undefined>(undefined);
  const [loading, setLoading] = useState(false);

  const status = deriveStatus(
    game.commence_time,
    game.score?.completed
  );

  async function handleExpand() {
    if (!expanded && odds === null) {
      setLoading(true);
      const [oddsData, propsData, scoreData] = await Promise.all([
        fetchOdds(game.game_id),
        fetchProps(game.game_id),
        fetchScore(game.game_id),
      ]);
      setOdds(oddsData);
      setProps(propsData);
      setScore(scoreData);
      setLoading(false);
    }
    setExpanded((v) => !v);
  }

  const scoreDisplay =
    game.score?.home_score != null && game.score?.away_score != null
      ? `${game.score.away_score} – ${game.score.home_score}`
      : "– – –";

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden mb-2">
      {/* Collapsed row */}
      <div
        className="flex items-center gap-3 px-4 py-3.5 cursor-pointer hover:bg-slate-800/50 transition-colors"
        onClick={handleExpand}
      >
        <span className="text-[11px] text-slate-500 min-w-[52px]">
          {game.commence_time
            ? new Date(game.commence_time).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })
            : "—"}
        </span>

        <div className="flex-1">
          <p className="text-sm font-medium text-slate-100">
            {game.away_team} vs {game.home_team}
          </p>
          <p className="text-[11px] text-slate-500 mt-0.5">
            {game.sport} · {game.season}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <StatusBadge status={status} />
          <span
            className={cn(
              "text-[13px] font-semibold min-w-[52px] text-right",
              game.score ? "text-slate-300" : "text-slate-700"
            )}
          >
            {scoreDisplay}
          </span>
        </div>

        <ChevronRight
          className={cn(
            "w-4 h-4 text-slate-500 transition-transform",
            expanded && "rotate-90"
          )}
        />
      </div>

      {/* Expanded panel */}
      {expanded && (
        <div className="border-t border-slate-800 bg-slate-950">
          {/* Tab bar */}
          <div className="flex border-b border-slate-800 px-4">
            {(["odds", "props", "score"] as Tab[]).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={cn(
                  "text-xs px-3 py-2.5 border-b-2 transition-colors capitalize",
                  activeTab === tab
                    ? "border-blue-400 text-blue-400"
                    : "border-transparent text-slate-500 hover:text-slate-400"
                )}
              >
                {tab === "props" ? "Player Props" : tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>

          {loading ? (
            <p className="px-4 py-4 text-sm text-slate-500">Loading...</p>
          ) : (
            <>
              {activeTab === "odds" && <OddsTab odds={odds ?? []} />}
              {activeTab === "props" && <PlayerPropsTab props={props ?? []} />}
              {activeTab === "score" && (
                <ScoreTab score={score ?? null} game={game} />
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
