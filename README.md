# Support Agent Training Simulator

**Live demo:** https://support-agent-simulator.vercel.app (runs in Demo Mode — scripted responses,
no API key required, free to click around)

A practice tool for learning **ServiceNow-style Incident Management**. An AI plays the role of a
customer contacting support over live chat; you play the support agent, working the incident the
way you would in ServiceNow's Agent Workspace (Impact/Urgency/Priority, States, Assignment Groups,
Work Notes vs. Additional Comments). When you resolve an incident, a second AI acts as a coach and
scores how you handled it — including whether you assigned the correct priority.

This is **not** a real ticketing system. Nothing here integrates with an actual ServiceNow instance;
it re-implements ServiceNow's incident data model and terminology closely enough that the experience
transfers directly, so you can talk about it in an interview as hands-on ServiceNow-style practice.

## Stack

- **Backend:** Python, FastAPI, SQLAlchemy + Alembic, SQLite (swap to Postgres by changing one env var)
- **Frontend:** Next.js (App Router), TypeScript, Tailwind CSS, shadcn/ui
- **AI:** Anthropic API (`anthropic` Python SDK), streaming for the live chat

## Project layout

```
backend/
  app/
    models/        SQLAlchemy models (Incident, Message, Feedback)
    schemas/        Pydantic request/response schemas
    services/       Priority matrix logic + Anthropic client (persona gen, chat, coaching)
    routers/        FastAPI endpoints
    alembic/        Migrations
frontend/
  src/
    app/            Next.js pages (incident list, incident record)
    components/     Incident form, chat panel, feedback panel, badges, shadcn/ui primitives
    lib/            API client + shared types
```

## Setup

### 1. Backend

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate
pip install -r requirements.txt

cp .env.example .env
# then edit .env and set ANTHROPIC_API_KEY=sk-ant-...
```

`.env` also controls the database:

```
ANTHROPIC_API_KEY=sk-ant-...
DATABASE_URL=sqlite:///./ticket_sim.db
```

Apply migrations (creates `ticket_sim.db` and all tables):

```bash
alembic upgrade head
```

Run the API server:

```bash
uvicorn app.main:app --reload --port 8001
```

The API is now at `http://localhost:8001` (interactive docs at `/docs`).

> **Switching to Postgres later:** install `psycopg2-binary`, point `DATABASE_URL` at your Postgres
> instance (e.g. `postgresql://user:pass@localhost:5432/ticket_sim`), and re-run
> `alembic upgrade head`. Nothing else in the codebase is SQLite-specific.

### 2. Frontend

```bash
cd frontend
npm install
```

`frontend/.env.local` already points at the backend:

```
NEXT_PUBLIC_API_URL=http://localhost:8001
```

Run the dev server:

```bash
npm run dev
```

Open `http://localhost:3000`.

### 3. Using it

1. Click **New incident** on the incident list. This calls Claude to invent a customer persona,
   an IT issue, a category, and a hidden "true" priority — then opens the chat with the customer's
   first message already sent.
2. Open the incident. The left/top panel is the incident record (Impact, Urgency, auto-calculated
   Priority, State, Assignment Group, description). The right/bottom panel is the live chat.
3. Reply to the customer — your message streams the AI persona's next reply back token-by-token,
   with a "customer is typing…" indicator while it streams.
4. Toggle **"Post as internal work note"** to log something for other agents instead of replying to
   the customer. Work notes are never sent to the AI persona — it doesn't see them.
5. Adjust Impact/Urgency as you learn more; Priority recalculates automatically using the same
   matrix ServiceNow uses.
6. When you're done, set **State → Resolved**. This automatically calls a second AI (acting as a
   coach, not the customer) to grade the transcript: clarity, empathy, technical accuracy, whether
   your assigned priority matched the scenario's true priority, and free-text coaching notes. The
   feedback panel appears below the incident form once it's ready.

## ServiceNow terminology reference

If you haven't used ServiceNow before (or want a quick refresher to explain this project in an
interview), here's what each concept maps to:

- **Impact** — how broadly the issue affects the business (1-High, 2-Medium, 3-Low). "Is the whole
  building down, or just one person's mouse?"
- **Urgency** — how quickly it needs to be fixed, independent of how many people it affects
  (1-High, 2-Medium, 3-Low). "Does this need to be fixed in the next 10 minutes, or can it wait
  until tomorrow?"
- **Priority** — derived from Impact × Urgency using a fixed lookup matrix, not set directly. This
  is exactly how ServiceNow's out-of-the-box priority matrix works:

  |                     | Urgency: High | Urgency: Medium | Urgency: Low |
  |---------------------|:---:|:---:|:---:|
  | **Impact: High**    | 1 – Critical | 2 – High     | 3 – Moderate |
  | **Impact: Medium**  | 2 – High     | 3 – Moderate | 4 – Low      |
  | **Impact: Low**     | 3 – Moderate | 4 – Low      | 4 – Low      |

  (See `backend/app/services/priority.py` for the implementation.)

- **State** — where the incident is in its lifecycle: New → In Progress → On Hold → Resolved →
  Closed. This app auto-triggers coaching feedback the moment State becomes Resolved.
- **Assignment Group** — the team responsible for working the incident (e.g. Network Operations,
  Desktop Support). Randomly assigned when the incident is generated, editable like in ServiceNow.
- **Work Notes vs. Additional Comments** — ServiceNow's incident form has two message streams:
  *Work Notes* are internal-only, visible to agents but never to the customer; *Additional Comments*
  are customer-visible. This app models the same split — the toggle under the chat box controls
  which one your message becomes. Only customer-visible messages are ever sent to (or seen by) the
  AI-played customer.

## Demo Mode (for public deployments)

Set `DEMO_MODE=true` in `backend/.env` (or the deployment's env vars) to run the entire app on
pre-written canned content instead of real Claude API calls — no incident generation, chat reply,
or coaching call ever touches the Anthropic API in this mode. This is meant for a publicly
deployed showcase link: it costs nothing no matter how much traffic it gets, and the deployment
doesn't even need `ANTHROPIC_API_KEY` set, since it's never read.

- Incidents are drawn from a small pool of hand-written scenarios (`backend/app/services/demo_fixtures.py`)
- Chat replies cycle through a short list of generic in-character follow-up lines, still streamed
  word-by-word so the "customer is typing…" UI behaves identically to real mode
- Coaching feedback returns plausible scores and canned notes, but `prioritization_correct` is
  still computed for real against the scenario's true priority — that mechanic stays meaningful
- The frontend shows a small "Demo Mode" banner whenever the backend reports `demo_mode: true`
  (via `GET /health`)

Normal local use is unaffected — leave `DEMO_MODE` unset (or `false`) and everything calls the real
API exactly as described above.

## Deploying a public demo

A minimal free-tier setup for a live, clickable link:

1. **Backend → Render.com** (free web service tier): point it at `backend/`, build command
   `pip install -r requirements.txt`, start command `uvicorn app.main:app --host 0.0.0.0 --port $PORT`.
   Set env vars `DEMO_MODE=true` and `DATABASE_URL=sqlite:///./ticket_sim.db` — **do not** set
   `ANTHROPIC_API_KEY` there at all. Render's free disk is ephemeral, so the SQLite data resets on
   redeploy/restart, which is actually desirable for a public demo.
2. **Frontend → Vercel** (free tier, native Next.js support): point it at `frontend/`, set
   `NEXT_PUBLIC_API_URL` to the Render backend's URL.
3. Back on Render, set `ALLOWED_ORIGINS` to your Vercel URL so the backend's CORS allows it.
4. Confirm by opening the Vercel URL in a private/incognito window and clicking through — you
   should see the "Demo Mode" banner and be able to create/chat/resolve an incident with no key
   configured anywhere in that environment.

## Notes on the design

- The AI customer's system prompt explicitly tells it to stay in character, not resolve its own
  issue, and to vary mood/technical skill/clarity per scenario — so no two incidents play out quite
  the same way, and some are deliberately vague or meandering, like real end users.
- The "true priority" for each scenario is generated by the same call that creates the incident and
  is hidden from the UI (the API strips it from responses) until the incident is Resolved, so you
  can't peek at the answer while you work the ticket.
- The coaching/evaluator call uses a separate, non-in-character system prompt and only ever sees the
  customer-visible transcript (never work notes), mirroring how a real QA reviewer would only see
  what the customer saw.
- If the coaching call fails for any reason (rate limit, bad key, etc.), resolving the incident still
  succeeds — the feedback panel just shows a "not available yet" state instead of blocking your work.
