export type Priority = 1 | 2 | 3 | 4;
export type ImpactUrgency = 1 | 2 | 3;

export const PRIORITY_LABELS: Record<Priority, string> = {
  1: "1 - Critical",
  2: "2 - High",
  3: "3 - Moderate",
  4: "4 - Low",
};

export const IMPACT_URGENCY_LABELS: Record<ImpactUrgency, string> = {
  1: "1 - High",
  2: "2 - Medium",
  3: "3 - Low",
};

export const STATES = ["New", "In Progress", "On Hold", "Resolved", "Closed"] as const;
export type IncidentState = (typeof STATES)[number];

export interface IncidentListItem {
  id: number;
  number: string;
  short_description: string;
  priority: Priority;
  state: IncidentState;
  assignment_group: string;
  created_at: string;
}

export interface Incident {
  id: number;
  number: string;
  short_description: string;
  description: string;
  caller_name: string;
  category: string;
  subcategory: string;
  impact: ImpactUrgency;
  urgency: ImpactUrgency;
  priority: Priority;
  state: IncidentState;
  assignment_group: string;
  created_at: string;
  true_priority: Priority | null;
}

export interface Message {
  id: number;
  incident_id: number;
  sender: "client_ai" | "agent";
  body: string;
  is_work_note: boolean;
  created_at: string;
}

export interface Feedback {
  id: number;
  incident_id: number;
  clarity_score: number;
  empathy_score: number;
  technical_accuracy_score: number;
  prioritization_correct: boolean;
  notes: string;
  created_at: string;
  true_priority: Priority;
  assigned_priority: Priority;
}
