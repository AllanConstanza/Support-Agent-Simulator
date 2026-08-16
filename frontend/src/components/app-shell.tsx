import Link from "next/link";
import { LayoutList, LifeBuoy, Sparkles } from "lucide-react";

import { DemoBanner } from "@/components/demo-banner";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen w-full overflow-hidden bg-muted/30 text-sm">
      <aside className="flex w-56 shrink-0 flex-col border-r bg-background">
        <div className="flex items-center gap-2 border-b px-4 py-3">
          <LifeBuoy className="h-5 w-5 text-primary" />
          <div className="leading-tight">
            <div className="font-semibold">Agent Workspace</div>
            <div className="text-xs text-muted-foreground">Training Simulator</div>
          </div>
        </div>
        <nav className="flex flex-col gap-1 p-2">
          <Link
            href="/"
            className="flex items-center gap-2 rounded-md px-3 py-2 text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <LayoutList className="h-4 w-4" />
            Incidents
          </Link>
        </nav>
        <div className="mt-auto border-t p-3 text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5" />
            <span>AI-played customers</span>
          </div>
        </div>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <DemoBanner />
        <main className="flex min-h-0 flex-1 flex-col overflow-hidden">{children}</main>
      </div>
    </div>
  );
}
