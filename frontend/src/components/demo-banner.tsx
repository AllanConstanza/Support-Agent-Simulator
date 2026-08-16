"use client";

import { useEffect, useState } from "react";
import { Sparkles } from "lucide-react";

import { api } from "@/lib/api";

export function DemoBanner() {
  const [demoMode, setDemoMode] = useState(false);

  useEffect(() => {
    let cancelled = false;
    api
      .getHealth()
      .then((res) => {
        if (!cancelled) setDemoMode(res.demo_mode);
      })
      .catch(() => {
        // Backend unreachable — say nothing, the rest of the app will surface that error.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!demoMode) return null;

  return (
    <div className="flex items-center justify-center gap-2 border-b bg-amber-50 px-4 py-1.5 text-xs font-medium text-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
      <Sparkles className="h-3.5 w-3.5" />
      Demo Mode — scripted responses, no live AI calls
    </div>
  );
}
