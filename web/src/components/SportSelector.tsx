// web/src/components/SportSelector.tsx
import { useSport, type Sport } from "@/lib/sport";

const SPORT_LABEL: Record<Sport, string> = {
  NBA: "🏀 NBA",
  MLB: "⚾ MLB",
};

export function SportSelector() {
  const { sport, setSport } = useSport();

  return (
    <select
      value={sport}
      onChange={(e) => setSport(e.target.value as Sport)}
      className="bg-slate-800 border border-slate-700 rounded px-2 py-1 text-sm text-slate-100 focus:outline-none focus:border-blue-400"
      aria-label="Sport"
    >
      <option value="NBA">{SPORT_LABEL.NBA}</option>
      <option value="MLB">{SPORT_LABEL.MLB}</option>
    </select>
  );
}
