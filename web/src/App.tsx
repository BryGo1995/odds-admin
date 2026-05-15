import { BrowserRouter, Routes, Route, Link, useLocation } from "react-router-dom";
import { GamesPage } from "./pages/GamesPage";
import { PlayersPage } from "./pages/PlayersPage";
import { PlayerDetailPage } from "./pages/PlayerDetailPage";
import { RecommendationsPage } from "./pages/RecommendationsPage";
import { SportProvider } from "./lib/sport";
import { SportSelector } from "./components/SportSelector";
import { cn } from "@/lib/utils";

function NavLink({ to, children }: { to: string; children: React.ReactNode }) {
  const { pathname } = useLocation();
  const active = pathname === to || (to !== "/" && pathname.startsWith(to));
  return (
    <Link
      to={to}
      className={cn(
        "text-sm transition-colors pb-0.5",
        active
          ? "text-slate-100 border-b-2 border-blue-400"
          : "text-slate-500 hover:text-slate-300"
      )}
    >
      {children}
    </Link>
  );
}

function Layout() {
  return (
    <div className="min-h-screen bg-slate-950">
      <nav className="bg-slate-900 border-b border-slate-800 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-slate-100 font-bold text-base tracking-wide">
            Odds Admin
          </span>
          <SportSelector />
        </div>
        <div className="flex gap-4 text-sm">
          <NavLink to="/">Games</NavLink>
          <NavLink to="/players">Players</NavLink>
          <NavLink to="/recommendations">Recommendations</NavLink>
        </div>
      </nav>

      <Routes>
        <Route path="/" element={<GamesPage />} />
        <Route path="/players" element={<PlayersPage />} />
        <Route path="/players/:id" element={<PlayerDetailPage />} />
        <Route path="/recommendations" element={<RecommendationsPage />} />
      </Routes>
    </div>
  );
}

export default function App() {
  return (
    <SportProvider>
      <BrowserRouter>
        <Layout />
      </BrowserRouter>
    </SportProvider>
  );
}
