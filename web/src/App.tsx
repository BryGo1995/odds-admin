import { GamesPage } from "./pages/GamesPage";

export default function App() {
  return (
    <div className="min-h-screen bg-slate-950">
      {/* Nav bar */}
      <nav className="bg-slate-900 border-b border-slate-800 px-4 py-3 flex items-center justify-between">
        <span className="text-slate-100 font-bold text-base tracking-wide">
          Odds Admin
        </span>
        <div className="flex gap-4 text-sm">
          <span className="text-slate-100 border-b-2 border-blue-400 pb-0.5">
            Games
          </span>
          <span className="text-slate-500 cursor-not-allowed" title="Coming soon">
            Raw Data
          </span>
        </div>
      </nav>

      <GamesPage />
    </div>
  );
}
