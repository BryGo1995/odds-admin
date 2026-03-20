import { useEffect, useState } from "react";
import { fetchGames } from "@/api/client";
import { GameCard } from "@/components/GameCard";
import type { Game } from "@/api/client";

function toLocalDateString(isoString: string): string {
  return new Date(isoString).toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function groupGamesByDate(games: Game[]): [string, Game[]][] {
  const map = new Map<string, Game[]>();
  for (const game of games) {
    const label = game.commence_time
      ? toLocalDateString(game.commence_time)
      : "Unknown Date";
    if (!map.has(label)) map.set(label, []);
    map.get(label)!.push(game);
  }
  return Array.from(map.entries());
}

function getRelativeLabel(dateLabel: string): string {
  const today = toLocalDateString(new Date().toISOString());
  const yesterday = toLocalDateString(
    new Date(Date.now() - 86400000).toISOString()
  );
  if (dateLabel === today) return `Today — ${dateLabel}`;
  if (dateLabel === yesterday) return `Yesterday — ${dateLabel}`;
  return dateLabel;
}

export function GamesPage() {
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchGames()
      .then(setGames)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <p className="px-6 py-8 text-slate-500">Loading games...</p>;
  }
  if (error) {
    return (
      <p className="px-6 py-8 text-red-400">
        Failed to load games: {error}
      </p>
    );
  }
  if (games.length === 0) {
    return (
      <p className="px-6 py-8 text-slate-500">No games found in the database.</p>
    );
  }

  const grouped = groupGamesByDate(games);

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      {grouped.map(([dateLabel, dateGames]) => (
        <div key={dateLabel} className="mb-8">
          <p className="text-[11px] font-bold uppercase tracking-widest text-slate-500 pb-2 mb-3 border-b border-slate-800">
            {getRelativeLabel(dateLabel)}
          </p>
          {dateGames.map((game) => (
            <GameCard key={game.game_id} game={game} />
          ))}
        </div>
      ))}
    </div>
  );
}
