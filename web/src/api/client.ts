export interface ScoreEmbed {
  home_score: number | null;
  away_score: number | null;
  completed: boolean;
}

export interface Game {
  game_id: string;
  home_team: string | null;
  away_team: string | null;
  commence_time: string | null;
  season: string | null;
  sport: string | null;
  score: ScoreEmbed | null;
}

export interface OddsItem {
  bookmaker: string | null;
  market_type: string | null;
  outcome_name: string | null;
  price: number | null;
  point: number | null;
  last_update: string | null;
}

export interface PlayerPropItem {
  bookmaker: string | null;
  player_name: string | null;
  prop_type: string | null;
  outcome: string | null;
  price: number | null;
  point: number | null;
}

export interface ScoreItem {
  game_id: string | null;
  home_score: number | null;
  away_score: number | null;
  completed: boolean;
  last_update: string | null;
  fetched_at: string;
}

const BASE = "/api";

export async function fetchGames(): Promise<Game[]> {
  const res = await fetch(`${BASE}/games`);
  if (!res.ok) throw new Error("Failed to fetch games");
  return res.json();
}

export async function fetchOdds(gameId: string): Promise<OddsItem[]> {
  const res = await fetch(`${BASE}/games/${gameId}/odds`);
  if (!res.ok) throw new Error("Failed to fetch odds");
  return res.json();
}

export async function fetchProps(gameId: string): Promise<PlayerPropItem[]> {
  const res = await fetch(`${BASE}/games/${gameId}/props`);
  if (!res.ok) throw new Error("Failed to fetch props");
  return res.json();
}

export async function fetchScore(gameId: string): Promise<ScoreItem | null> {
  const res = await fetch(`${BASE}/games/${gameId}/scores`);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error("Failed to fetch score");
  return res.json();
}
