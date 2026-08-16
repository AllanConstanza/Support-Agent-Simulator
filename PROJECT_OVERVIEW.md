# Support Agent Training Simulator — Project Overview

This file is a persistent reference for what this app is, how it's built, and how it works — so
you (or a future session) can pick it back up without re-deriving context.

## Goal

A practice tool for learning **ServiceNow-style Incident Management**. It is NOT a real ticketing
system and does not connect to an actual ServiceNow instance. Instead:

- An AI plays a **customer** contacting IT support over live chat (invents its own persona, issue,
  mood, technical skill level, and how clearly it communicates).
- You play the **support agent**, working the incident the way you would in ServiceNow's Agent
  Workspace — setting Impact/Urgency, watching Priority auto-calculate, managing State, posting
  Work Notes vs. customer-visible replies.
- When you resolve the incident, a second AI acts as a **coach**, scoring your performance
  (clarity, empathy, technical accuracy, whether you prioritized it correctly) against a "true"
  priority that was hidden from you the whole time.

The point is hands-on repetition with ServiceNow's actual data model and vocabulary (Impact,
Urgency, Priority matrix, Assignment Group, States, Work Notes) so the practice transfers directly
and is easy to describe in an interview.

## Tech stack

| Layer | Technology |
|---|---|
| Backend | Python, FastAPI, SQLAlchemy (ORM), Alembic (migrations), SQLite (dev DB, swappable to Postgres via one env var) |
| Frontend | Next.js 16 (App Router), TypeScript, Tailwind CSS, shadcn/ui (built on Base UI) |
| AI | Anthropic API via the official `anthropic` Python SDK — model: `claude-opus-5` (set in `backend/app/config.py`), streaming used for the live chat |

## Where things live

```
backend/
  app/
    models/          SQLAlchemy tables: Incident, Message, Feedback
    schemas/          Pydantic request/response shapes
    services/
      priority.py      The Impact x Urgency -> Priority matrix (pure lookup table)
      anthropic_client.py   All 3 AI calls: persona generation, in-character chat reply, coaching evaluation
    routers/
      incidents.py     POST/GET/PATCH /incidents
      messages.py      GET/POST /incidents/{id}/messages (streaming reply lives here)
      feedback.py       GET/POST /incidents/{id}/feedback
    alembic/           Migration scripts
  .env                 ANTHROPIC_API_KEY + DATABASE_URL (not committed — gitignored)
frontend/
  src/
    app/
      page.tsx                  Incident list view ("/")
      incidents/[id]/page.tsx    Incident record view (form + chat)
    components/
      incident-form.tsx    Left panel: Impact/Urgency/State/etc, editable, auto-saves via PATCH
      chat-panel.tsx        Right panel: streams the AI customer's replies, work-note toggle
      feedback-panel.tsx    Shows coaching scores once an incident is Resolved
    lib/
      api.ts, types.ts      Typed fetch client for the backend
README.md              Full setup + usage instructions + ServiceNow terminology glossary
```

## How it actually works, end to end

1. **You click "New incident."** The frontend calls `POST /incidents`. The backend calls Claude
   once with a system prompt instructing it to invent a customer name, an IT issue, a category, a
   communication style, and — critically — a **hidden "true" priority** for the scenario (the
   objectively correct answer, which the API never returns to the frontend until the incident is
   Resolved). The backend also computes the *displayed* Priority from Impact × Urgency using the
   same matrix ServiceNow uses. The AI's opening chat message is saved as the first message.

2. **You open the incident.** Left panel is the incident record (like ServiceNow's form). Right
   panel is the chat, seeded with the customer's opening message.

3. **You reply.** The frontend calls `POST /incidents/{id}/messages`. The backend saves your
   message, then re-sends the *entire customer-visible conversation so far* to Claude (with the
   original persona system prompt) and streams its next in-character reply back token-by-token
   over Server-Sent Events — that's the "customer is typing…" effect. Work Notes are a separate
   toggle: those are saved but never sent to the AI, exactly like ServiceNow's internal notes.

4. **You adjust Impact/Urgency.** Each change hits `PATCH /incidents/{id}`, which recalculates
   Priority server-side from the same fixed matrix — nothing about it is AI-generated, it's a
   deterministic lookup table (see `backend/app/services/priority.py`).

5. **You set State → Resolved.** That same `PATCH` call detects the New → Resolved transition and
   calls Claude a third time — this time with a completely different, non-in-character "coach"
   system prompt, given only the customer-visible transcript (no work notes) plus the hidden true
   priority and the priority you actually assigned. It returns structured scores and free-text
   notes, saved as `Feedback` and surfaced in the panel below the form. If this call fails for any
   reason, the Resolved state still sticks — grading is best-effort and never blocks your work.

## Verifying your API usage & billing

Every call this app makes goes through your Anthropic API key, and it's billed per token like any
other API usage — there's no separate flat fee, and nothing here uses a free tier.

- **See exactly what you've spent:** log in at **https://console.anthropic.com** and check the
  **Usage** and **Billing** pages under your organization. Usage is broken down by day/model, so
  you can see the incident-generation, chat-reply, and coaching calls show up as ordinary Messages
  API requests.
- **What model this app uses:** `claude-opus-5`, set in `backend/app/config.py`
  (`anthropic_model` field). Opus-tier pricing is the highest of Anthropic's current lineup — if
  you want this to cost less per practice session, the cheapest change is switching that one
  setting to `claude-haiku-4-5` (or add a `.env` override) since prompts are already written to
  work with any current Claude model.
- **What actually costs money here:** three calls per meaningful action — one to generate an
  incident, one per chat message you send (each reply re-sends the growing conversation history,
  so cost grows slowly as a chat gets longer), and one when you resolve an incident. There's no
  polling loop or background job silently spending tokens — nothing calls the API unless you
  click "New incident," send a chat message, or resolve an incident.
- **Setting a budget cap:** Anthropic Console lets you set spend limits/alerts per API key under
  **Settings → Limits** — worth doing while you're experimenting.

## Demo Mode — showing this off without spending your own API budget

`backend/app/config.py` has a `demo_mode` flag (env var `DEMO_MODE`). When it's `true`:

- `generate_incident_persona()`, `stream_persona_reply()`, and `evaluate_transcript()` in
  `backend/app/services/anthropic_client.py` all short-circuit at the top of the function and
  return canned data from `backend/app/services/demo_fixtures.py` instead of calling
  `_client`/`_async_client` — the Anthropic SDK objects still exist but their `.create()`/`.stream()`
  methods are never invoked, so literally zero requests reach `api.anthropic.com`.
- `GET /health` reports `{"status": "ok", "demo_mode": true/false}`; the frontend's
  `DemoBanner` component (`frontend/src/components/demo-banner.tsx`, mounted in `AppShell`) polls
  that on load and shows a small banner when it's on.
- This is what makes a public GitHub/deployed showcase safe: deploy the backend with
  `DEMO_MODE=true` and simply never give that environment an `ANTHROPIC_API_KEY` at all — there's
  no key for anyone's clicking to bill against, regardless of traffic.
- Your local setup is unaffected either way: leave `DEMO_MODE` unset for normal use with your real
  key, exactly as before.

Full deployment steps (Render for the backend, Vercel for the frontend) are in `README.md` under
"Deploying a public demo."

## Running it without retyping `localhost:3000` every time

Two options, from simplest to most "app-like":

1. **A start script that opens the browser for you.** See `start.sh` in the project root — it
   starts both servers in the background and automatically opens the tab, so you just run one
   command instead of two terminals + typing a URL.
2. **Install it as a desktop app shortcut** (Chrome/Edge, once the frontend is running):
   go to `http://localhost:3000`, open the browser menu → **Cast, save, and share** (or the "⋮"
   menu) → **Install page as app** (Chrome) / **Apps → Install this site as an app** (Edge). That
   creates a real Dock/taskbar icon that opens straight into the app in its own window — no address
   bar, no manually navigating — but it still requires the backend and frontend dev servers to be
   running underneath it.

Either way, the underlying dev servers still need to be running somewhere — this is a local dev
setup, not a deployed app, so "running it" always means the two processes are up. `start.sh` is the
low-effort way to make that one command instead of a manual routine.
