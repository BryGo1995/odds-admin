import { cn } from "@/lib/utils";
import type { ScoreItem } from "@/api/client";
import type { Game } from "@/api/client";

interface ScoreTabProps {
  score: ScoreItem | null;
  game: Game;
}

export function ScoreTab({ score, game }: ScoreTabProps) {
  if (!score) {
    return (
      <p className="px-4 py-6 text-sm text-slate-500">No score available yet.</p>
    );
  }

  const awayWon =
    score.away_score !== null &&
    score.home_score !== null &&
    score.away_score > score.home_score;

  const homeWon =
    score.home_score !== null &&
    score.away_score !== null &&
    score.home_score > score.away_score;

  return (
    <div className="px-4 py-6">
      <div className="flex items-center gap-8 justify-center mb-4">
        <div className="flex-1 text-center">
          <p className="text-[11px] uppercase tracking-widest text-slate-500 mb-1">Away</p>
          <p className="text-sm font-semibold text-slate-300 mb-3">{game.away_team}</p>
          <p className={cn("text-5xl font-extrabold", awayWon ? "text-green-400" : "text-slate-200")}>
            {score.away_score ?? "—"}
          </p>
        </div>

        <div className="text-2xl text-slate-700 mt-6">—</div>

        <div className="flex-1 text-center">
          <p className="text-[11px] uppercase tracking-widest text-slate-500 mb-1">Home</p>
          <p className="text-sm font-semibold text-slate-300 mb-3">{game.home_team}</p>
          <p className={cn("text-5xl font-extrabold", homeWon ? "text-green-400" : "text-slate-200")}>
            {score.home_score ?? "—"}
          </p>
        </div>
      </div>

      <div className="text-center">
        <span className="inline-block bg-green-950 text-green-400 text-[10px] font-bold tracking-widest px-3 py-1 rounded mb-2">
          {score.completed ? "FINAL" : "IN PROGRESS"}
        </span>
        {score.last_update && (
          <p className="text-[11px] text-slate-600">
            Last updated: {new Date(score.last_update).toLocaleString()}
          </p>
        )}
      </div>
    </div>
  );
}
