import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { fetchPlayers } from "@/api/client";
import type { PlayerListItem, MlbPlayerListItem } from "@/api/client";
import { useSport } from "@/lib/sport";

type AnyPlayer = PlayerListItem | MlbPlayerListItem;

function isMlbPlayer(p: AnyPlayer): p is MlbPlayerListItem {
  return "bats" in p;
}

export function PlayersPage() {
  const { sport } = useSport();
  const [players, setPlayers] = useState<AnyPlayer[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    let isCurrent = true;
    setLoading(true);
    setError(null);
    fetchPlayers(sport)
      .then((data) => { if (isCurrent) setPlayers(data); })
      .catch((e) => { if (isCurrent) setError(e.message); })
      .finally(() => { if (isCurrent) setLoading(false); });
    return () => { isCurrent = false; };
  }, [sport]);

  const filtered = players.filter((p) =>
    p.full_name.toLowerCase().includes(search.toLowerCase()),
  );

  if (loading) {
    return <p className="px-6 py-8 text-slate-500">Loading players...</p>;
  }
  if (error) {
    return <p className="px-6 py-8 text-red-400">Failed to load players: {error}</p>;
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      <input
        type="text"
        placeholder="Search players..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full mb-4 px-3 py-2 bg-slate-800 border border-slate-700 rounded text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-400"
      />

      {filtered.length === 0 ? (
        <p className="text-slate-500 text-sm">No players found.</p>
      ) : (
        <div className="flex flex-col gap-1">
          {filtered.map((player) => (
            <button
              key={player.player_id}
              onClick={() => navigate(`/players/${player.player_id}`)}
              className="flex items-center gap-4 px-4 py-3 bg-slate-900 border border-slate-800 rounded-lg text-left hover:bg-slate-800/50 transition-colors"
            >
              <div className="flex-1">
                <p className="text-sm font-medium text-slate-100">{player.full_name}</p>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  {player.position ?? "—"} · {player.team_abbreviation ?? "—"}
                  {isMlbPlayer(player) && (player.bats || player.throws) && (
                    <span className="ml-2 text-slate-600">
                      · B/T {player.bats ?? "—"}/{player.throws ?? "—"}
                    </span>
                  )}
                </p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
