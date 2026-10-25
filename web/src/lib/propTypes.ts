// web/src/lib/propTypes.ts
/**
 * Display-friendly label for a prop_type code returned by the backend.
 * Falls back to a tidied-up version of the raw code (e.g., "player_points"
 * → "Points") when the code is unknown.
 */
export const PROP_TYPE_LABEL: Record<string, string> = {
  // NBA
  player_points: "Points",
  player_rebounds: "Rebounds",
  player_assists: "Assists",
  // MLB
  batter_hits: "Hits",
  batter_total_bases: "Total Bases",
};

export function propTypeLabel(code: string | null | undefined): string {
  if (!code) return "—";
  if (code in PROP_TYPE_LABEL) return PROP_TYPE_LABEL[code];
  // Fallback: strip common prefixes, title-case
  return code
    .replace(/^player_/, "")
    .replace(/^batter_/, "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}
