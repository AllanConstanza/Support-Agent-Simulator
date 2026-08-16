import { cn } from "@/lib/utils";
import type { IncidentState } from "@/lib/types";

const STATE_STYLES: Record<IncidentState, string> = {
  New: "bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800",
  "In Progress":
    "bg-violet-100 text-violet-800 border-violet-300 dark:bg-violet-950 dark:text-violet-300 dark:border-violet-800",
  "On Hold":
    "bg-slate-100 text-slate-800 border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-600",
  Resolved:
    "bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800",
  Closed:
    "bg-gray-100 text-gray-600 border-gray-300 dark:bg-gray-900 dark:text-gray-400 dark:border-gray-700",
};

export function StateBadge({ state }: { state: IncidentState }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium whitespace-nowrap",
        STATE_STYLES[state],
      )}
    >
      {state}
    </span>
  );
}
