"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { api } from "@/lib/api";
import type { Incident } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { IncidentForm } from "@/components/incident-form";
import { ChatPanel } from "@/components/chat-panel";
import { FeedbackPanel } from "@/components/feedback-panel";
import { StateBadge } from "@/components/state-badge";
import { toast } from "sonner";

export default function IncidentRecordPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const incidentId = Number(id);
  const router = useRouter();

  const [incident, setIncident] = useState<Incident | null>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    try {
      const data = await api.getIncident(incidentId);
      setIncident(data);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load incident");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [incidentId]);

  if (loading) {
    return (
      <div className="flex h-full flex-col gap-4 p-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!incident) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3">
        <p className="text-sm text-muted-foreground">Incident not found.</p>
        <Button variant="outline" size="sm" onClick={() => router.push("/")}>
          Back to incidents
        </Button>
      </div>
    );
  }

  const isResolved = incident.state === "Resolved" || incident.state === "Closed";

  return (
    <div className="flex h-full flex-col">
      <header className="flex items-center gap-3 border-b bg-background px-6 py-3">
        <Button variant="ghost" size="icon" onClick={() => router.push("/")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex items-baseline gap-2">
          <h1 className="font-mono text-sm font-semibold">{incident.number}</h1>
          <span className="text-sm text-muted-foreground">{incident.short_description}</span>
        </div>
        <div className="ml-auto">
          <StateBadge state={incident.state} />
        </div>
      </header>

      <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[420px_1fr]">
        <div className="flex min-h-0 flex-col overflow-y-auto border-r">
          <IncidentForm incident={incident} onUpdated={setIncident} />
          {isResolved && (
            <div className="border-t p-4">
              <FeedbackPanel incidentId={incident.id} />
            </div>
          )}
        </div>

        <div className="min-h-0">
          <ChatPanel incidentId={incident.id} />
        </div>
      </div>
    </div>
  );
}
