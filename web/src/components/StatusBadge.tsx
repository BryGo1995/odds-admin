import { cn } from "@/lib/utils";

export type GameStatus = "LIVE" | "UPCOMING" | "FINAL";

export function deriveStatus(
  commenceTime: string | null,
  completed: boolean | undefined
): GameStatus {
  if (completed) return "FINAL";
  if (!commenceTime) return "UPCOMING";
  return new Date(commenceTime) <= new Date() ? "LIVE" : "UPCOMING";
}

interface StatusBadgeProps {
  status: GameStatus;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        "text-[10px] font-bold tracking-wide px-2 py-0.5 rounded",
        status === "LIVE" && "bg-red-900 text-red-400",
        status === "UPCOMING" && "bg-blue-950 text-blue-400",
        status === "FINAL" && "bg-green-950 text-green-400"
      )}
    >
      {status}
    </span>
  );
}
