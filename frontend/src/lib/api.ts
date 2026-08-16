import type { Feedback, Incident, IncidentListItem, Message } from "./types";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8001";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });
  if (!res.ok) {
    let detail = res.statusText;
    try {
      const body = await res.json();
      detail = body.detail ?? detail;
    } catch {
      // ignore
    }
    throw new Error(detail);
  }
  return res.json();
}

export const api = {
  listIncidents: (params?: { state?: string; priority?: number }) => {
    const search = new URLSearchParams();
    if (params?.state) search.set("state", params.state);
    if (params?.priority) search.set("priority", String(params.priority));
    const qs = search.toString();
    return request<IncidentListItem[]>(`/incidents${qs ? `?${qs}` : ""}`);
  },

  createIncident: () => request<Incident>("/incidents", { method: "POST" }),

  getIncident: (id: number) => request<Incident>(`/incidents/${id}`),

  updateIncident: (
    id: number,
    update: Partial<Pick<Incident, "impact" | "urgency" | "state" | "assignment_group">>,
  ) =>
    request<Incident>(`/incidents/${id}`, {
      method: "PATCH",
      body: JSON.stringify(update),
    }),

  listMessages: (incidentId: number) =>
    request<Message[]>(`/incidents/${incidentId}/messages`),

  postWorkNote: (incidentId: number, body: string) =>
    request<{ message: Message; reply: null }>(`/incidents/${incidentId}/messages`, {
      method: "POST",
      body: JSON.stringify({ body, is_work_note: true }),
    }),

  getFeedback: (incidentId: number) => request<Feedback>(`/incidents/${incidentId}/feedback`),

  getHealth: () => request<{ status: string; demo_mode: boolean }>("/health"),

  apiUrl: API_URL,
};
