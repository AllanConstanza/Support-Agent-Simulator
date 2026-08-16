"use client";

import { useState } from "react";
import { format } from "date-fns";

import type { Incident, ImpactUrgency, IncidentState } from "@/lib/types";
import { IMPACT_URGENCY_LABELS, STATES } from "@/lib/types";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { PriorityBadge } from "@/components/priority-badge";
import { api } from "@/lib/api";
import { toast } from "sonner";

const ASSIGNMENT_GROUPS = [
  "Service Desk",
  "Network Operations",
  "Desktop Support",
  "Application Support",
  "Database Administration",
  "Identity & Access Management",
];

export function IncidentForm({
  incident,
  onUpdated,
}: {
  incident: Incident;
  onUpdated: (incident: Incident) => void;
}) {
  const [saving, setSaving] = useState(false);

  async function patch(update: Partial<Pick<Incident, "impact" | "urgency" | "state" | "assignment_group">>) {
    setSaving(true);
    try {
      const updated = await api.updateIncident(incident.id, update);
      onUpdated(updated);
      if (update.state === "Resolved") {
        toast.success("Incident resolved — coaching feedback generated.");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update incident");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4 p-4">
      <div className="grid grid-cols-2 gap-x-4 gap-y-3">
        <Field label="Number">
          <Input value={incident.number} readOnly className="font-mono text-xs" />
        </Field>
        <Field label="Caller">
          <Input value={incident.caller_name} readOnly />
        </Field>

        <Field label="Category">
          <Input value={incident.category} readOnly />
        </Field>
        <Field label="Subcategory">
          <Input value={incident.subcategory} readOnly />
        </Field>

        <Field label="Impact">
          <Select
            value={String(incident.impact)}
            onValueChange={(v) => v && patch({ impact: Number(v) as ImpactUrgency })}
            disabled={saving}
          >
            <SelectTrigger size="sm" className="w-full">
              <SelectValue>
                {(v: string) => IMPACT_URGENCY_LABELS[Number(v) as ImpactUrgency]}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {[1, 2, 3].map((v) => (
                <SelectItem key={v} value={String(v)}>
                  {IMPACT_URGENCY_LABELS[v as ImpactUrgency]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Urgency">
          <Select
            value={String(incident.urgency)}
            onValueChange={(v) => v && patch({ urgency: Number(v) as ImpactUrgency })}
            disabled={saving}
          >
            <SelectTrigger size="sm" className="w-full">
              <SelectValue>
                {(v: string) => IMPACT_URGENCY_LABELS[Number(v) as ImpactUrgency]}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {[1, 2, 3].map((v) => (
                <SelectItem key={v} value={String(v)}>
                  {IMPACT_URGENCY_LABELS[v as ImpactUrgency]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        <Field label="Priority (auto-calculated)">
          <div className="flex h-8 items-center">
            <PriorityBadge priority={incident.priority} />
          </div>
        </Field>
        <Field label="State">
          <Select
            value={incident.state}
            onValueChange={(v) => v && patch({ state: v as IncidentState })}
            disabled={saving}
          >
            <SelectTrigger size="sm" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATES.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        <Field label="Assignment group" className="col-span-2">
          <Select
            value={incident.assignment_group}
            onValueChange={(v) => v && patch({ assignment_group: v })}
            disabled={saving}
          >
            <SelectTrigger size="sm" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ASSIGNMENT_GROUPS.map((g) => (
                <SelectItem key={g} value={g}>
                  {g}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      </div>

      <Field label="Short description">
        <Input value={incident.short_description} readOnly />
      </Field>
      <Field label="Description">
        <Textarea value={incident.description} readOnly rows={3} className="resize-none" />
      </Field>

      <p className="text-xs text-muted-foreground">
        Opened {format(new Date(incident.created_at), "MMM d, yyyy 'at' h:mm a")}
      </p>
    </div>
  );
}

function Field({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <Label className="mb-1 block text-xs font-medium text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}
