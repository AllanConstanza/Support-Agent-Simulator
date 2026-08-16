"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import { Plus, RefreshCw } from "lucide-react";

import { api } from "@/lib/api";
import type { IncidentListItem } from "@/lib/types";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { PriorityBadge } from "@/components/priority-badge";
import { StateBadge } from "@/components/state-badge";
import { STATES } from "@/lib/types";
import { toast } from "sonner";

const ALL = "__all__";

const PRIORITY_FILTER_LABELS: Record<string, string> = {
  [ALL]: "All priorities",
  "1": "1 - Critical",
  "2": "2 - High",
  "3": "3 - Moderate",
  "4": "4 - Low",
};

const SORT_LABELS: Record<string, string> = {
  created_at: "Sort: Newest",
  priority: "Sort: Priority",
};

export default function IncidentListPage() {
  const router = useRouter();
  const [incidents, setIncidents] = useState<IncidentListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [stateFilter, setStateFilter] = useState<string>(ALL);
  const [priorityFilter, setPriorityFilter] = useState<string>(ALL);
  const [sortBy, setSortBy] = useState<"created_at" | "priority">("created_at");

  async function load() {
    setLoading(true);
    try {
      const data = await api.listIncidents({
        state: stateFilter === ALL ? undefined : stateFilter,
        priority: priorityFilter === ALL ? undefined : Number(priorityFilter),
      });
      setIncidents(data);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load incidents");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stateFilter, priorityFilter]);

  const sorted = useMemo(() => {
    const copy = [...incidents];
    if (sortBy === "priority") {
      copy.sort((a, b) => a.priority - b.priority);
    } else {
      copy.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }
    return copy;
  }, [incidents, sortBy]);

  async function handleCreate() {
    setCreating(true);
    try {
      const incident = await api.createIncident();
      toast.success(`Created ${incident.number}`);
      router.push(`/incidents/${incident.id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create incident");
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="flex h-full flex-col">
      <header className="flex items-center justify-between border-b bg-background px-6 py-4">
        <div>
          <h1 className="text-lg font-semibold">Incidents</h1>
          <p className="text-xs text-muted-foreground">
            Practice queue — new incidents are generated and role-played by AI customers.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={load} disabled={loading}>
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button size="sm" onClick={handleCreate} disabled={creating}>
            <Plus className="h-4 w-4" />
            {creating ? "Generating..." : "New incident"}
          </Button>
        </div>
      </header>

      <div className="flex items-center gap-2 border-b bg-background px-6 py-2">
        <Select value={stateFilter} onValueChange={(v) => setStateFilter(v ?? ALL)}>
          <SelectTrigger size="sm" className="w-[160px]">
            <SelectValue placeholder="State">
              {(v: string) => (v === ALL ? "All states" : v)}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All states</SelectItem>
            {STATES.map((s) => (
              <SelectItem key={s} value={s}>
                {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={priorityFilter} onValueChange={(v) => setPriorityFilter(v ?? ALL)}>
          <SelectTrigger size="sm" className="w-[160px]">
            <SelectValue placeholder="Priority">
              {(v: string) => PRIORITY_FILTER_LABELS[v] ?? v}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All priorities</SelectItem>
            <SelectItem value="1">1 - Critical</SelectItem>
            <SelectItem value="2">2 - High</SelectItem>
            <SelectItem value="3">3 - Moderate</SelectItem>
            <SelectItem value="4">4 - Low</SelectItem>
          </SelectContent>
        </Select>

        <Select value={sortBy} onValueChange={(v) => setSortBy((v ?? "created_at") as typeof sortBy)}>
          <SelectTrigger size="sm" className="w-[160px]">
            <SelectValue placeholder="Sort by">
              {(v: string) => SORT_LABELS[v] ?? v}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="created_at">Sort: Newest</SelectItem>
            <SelectItem value="priority">Sort: Priority</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex-1 overflow-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[130px]">Number</TableHead>
              <TableHead>Short description</TableHead>
              <TableHead className="w-[140px]">Priority</TableHead>
              <TableHead className="w-[120px]">State</TableHead>
              <TableHead className="w-[200px]">Assignment group</TableHead>
              <TableHead className="w-[140px]">Created</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading &&
              Array.from({ length: 6 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 6 }).map((__, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-4 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))}

            {!loading && sorted.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="py-16 text-center text-muted-foreground">
                  No incidents yet. Click &ldquo;New incident&rdquo; to generate a practice scenario.
                </TableCell>
              </TableRow>
            )}

            {!loading &&
              sorted.map((incident) => (
                <TableRow
                  key={incident.id}
                  className="cursor-pointer"
                  onClick={() => router.push(`/incidents/${incident.id}`)}
                >
                  <TableCell className="font-mono text-xs text-primary">
                    {incident.number}
                  </TableCell>
                  <TableCell className="max-w-[420px] truncate">
                    {incident.short_description}
                  </TableCell>
                  <TableCell>
                    <PriorityBadge priority={incident.priority} />
                  </TableCell>
                  <TableCell>
                    <StateBadge state={incident.state} />
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {incident.assignment_group}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatDistanceToNow(new Date(incident.created_at), { addSuffix: true })}
                  </TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
