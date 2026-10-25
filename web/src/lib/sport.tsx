import { createContext, useContext, useState, type ReactNode } from "react";

export type Sport = "NBA" | "MLB";

const STORAGE_KEY = "odds-admin.sport";

interface SportContextValue {
  sport: Sport;
  setSport: (s: Sport) => void;
}

const SportContext = createContext<SportContextValue | null>(null);

function readStoredSport(): Sport {
  if (typeof window === "undefined") return "NBA";
  const stored = window.localStorage.getItem(STORAGE_KEY);
  return stored === "MLB" || stored === "NBA" ? stored : "NBA";
}

export function SportProvider({ children }: { children: ReactNode }) {
  const [sport, setSportState] = useState<Sport>(readStoredSport);

  const setSport = (s: Sport) => {
    setSportState(s);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, s);
    }
  };

  return (
    <SportContext.Provider value={{ sport, setSport }}>
      {children}
    </SportContext.Provider>
  );
}

export function useSport(): SportContextValue {
  const ctx = useContext(SportContext);
  if (!ctx) {
    throw new Error("useSport must be used inside <SportProvider/>");
  }
  return ctx;
}
