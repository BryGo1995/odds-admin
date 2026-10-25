import type { Sport } from "@/lib/sport";

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

export interface PlayerListItem {
  player_id: number;
  full_name: string;
  position: string | null;
  team_abbreviation: string | null;
}

export interface PlayerGameLogItem {
  game_date: string;
  matchup: string | null;
  wl: string | null;
  min: number | null;
  fga: number | null;
  fta: number | null;
  usg_pct: number | null;
  pts: number | null;
  reb: number | null;
  ast: number | null;
  blk: number | null;
  stl: number | null;
  plus_minus: number | null;
}

export interface MlbPlayerListItem {
  player_id: number;
  full_name: string;
  position: string | null;
  bats: string | null;
  throws: string | null;
  team_id: number | null;
  team_abbreviation: string | null;
  is_active: boolean | null;
}

export interface MlbPlayerGameLogItem {
  game_date: string;
  matchup: string | null;
  season: string;
  plate_appearances: number | null;
  at_bats: number | null;
  hits: number | null;
  doubles: number | null;
  triples: number | null;
  home_runs: number | null;
  rbi: number | null;
  runs: number | null;
  walks: number | null;
  strikeouts: number | null;
  stolen_bases: number | null;
  total_bases: number | null;
}

export interface PropRecommendationItem {
  id: number;
  player_name: string | null;
  prop_type: string | null;
  bookmaker: string | null;
  line: number | null;
  outcome: string | null;
  model_prob: number | null;
  implied_prob: number | null;
  edge: number | null;
  rank: number | null;
  model_version: string | null;
  game_date: string | null;
  sport: string | null;
}

const BASE = "/api";

export async function fetchGames(sport: Sport): Promise<Game[]> {
  const res = await fetch(`${BASE}/games?sport=${sport}`);
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

export async function fetchPlayers(
  sport: Sport,
): Promise<PlayerListItem[] | MlbPlayerListItem[]> {
  const res = await fetch(`${BASE}/players?sport=${sport}`);
  if (!res.ok) throw new Error("Failed to fetch players");
  return res.json();
}

export async function fetchPlayer(
  playerId: number,
  sport: Sport,
): Promise<PlayerListItem | MlbPlayerListItem> {
  const res = await fetch(`${BASE}/players/${playerId}?sport=${sport}`);
  if (!res.ok) throw new Error("Player not found");
  return res.json();
}

export async function fetchPlayerProps(
  playerId: number,
  sport: Sport,
): Promise<PlayerPropItem[]> {
  const res = await fetch(`${BASE}/players/${playerId}/props?sport=${sport}`);
  if (!res.ok) throw new Error("Failed to fetch player props");
  return res.json();
}

export async function fetchPlayerGameLogs(
  playerId: number,
  sport: Sport,
  season = "2025-26",
): Promise<PlayerGameLogItem[] | MlbPlayerGameLogItem[]> {
  const res = await fetch(
    `${BASE}/players/${playerId}/game-logs?sport=${sport}&season=${season}`,
  );
  if (!res.ok) throw new Error("Failed to fetch player game logs");
  return res.json();
}

export async function fetchRecommendations(
  date: string,
  sport: Sport,
): Promise<PropRecommendationItem[]> {
  const res = await fetch(`${BASE}/recommendations?date=${date}&sport=${sport}`);
  if (!res.ok) throw new Error("Failed to fetch recommendations");
  return res.json();
}

export async function fetchTopRecommendations(
  date: string,
  sport: Sport,
  limit = 5,
): Promise<PropRecommendationItem[]> {
  const res = await fetch(
    `${BASE}/recommendations/top?date=${date}&sport=${sport}&limit=${limit}`
  );
  if (!res.ok) throw new Error("Failed to fetch top recommendations");
  return res.json();
}
