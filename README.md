# Support Agent Training Simulator

**[Live demo →](https://support-agent-simulator.vercel.app)** (runs in Demo Mode — scripted responses, no API key required, free to click around)

A full-stack training simulator for **ServiceNow-style Incident Management**. One AI plays a
customer contacting IT support over live chat; the user practices working the incident like a
real support agent — setting Impact/Urgency, watching Priority auto-calculate, managing State,
and separating internal Work Notes from customer-facing replies. On resolution, a second AI acts
as a coach and grades the transcript against a hidden "true" priority the agent never saw.

It's not a real ticketing system and doesn't connect to an actual ServiceNow instance — it
re-implements ServiceNow's incident data model and terminology (Impact × Urgency → Priority,
States, Assignment Groups, Work Notes) closely enough to be genuine hands-on practice with the
concepts that drive real ITSM workflows.

## What this project demonstrates

- **Full-stack ownership** — a Python/FastAPI backend with a typed SQLAlchemy/Alembic data model,
  paired with a Next.js/TypeScript frontend, deployed end-to-end (Render + Vercel).
- **Multi-role LLM orchestration** — three distinct Anthropic API calls with different jobs and
  different system prompts: scenario generation, in-character streaming chat, and a separate
  "coach" evaluator that never sees the same context the customer persona did.
- **Deterministic business logic alongside AI** — Priority isn't AI-generated; it's a fixed
  Impact × Urgency lookup matrix matching ServiceNow's out-of-the-box behavior, kept independently
  testable from anything the model outputs.
- **Cost-aware, production-minded deployment** — a config-driven "Demo Mode" swaps every AI call
  for scripted fixtures, so the public demo is fully interactive with zero API spend and no key
  exposed, regardless of traffic.

## Stack

- **Backend:** Python, FastAPI, SQLAlchemy + Alembic, SQLite (swaps to Postgres via one env var)
- **Frontend:** Next.js (App Router), TypeScript, Tailwind CSS, shadcn/ui
- **AI:** Anthropic API (`anthropic` Python SDK), streaming for the live chat

## Architecture

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

**End-to-end flow:**

1. Creating an incident calls Claude once to invent a customer persona, an IT issue, a category,
   and a hidden "true" priority (never exposed to the client until resolution). The app separately
   computes the *displayed* Priority from Impact × Urgency via a deterministic matrix.
2. Each agent reply re-sends the customer-visible conversation to Claude and streams the next
   in-character response back over Server-Sent Events. Internal Work Notes are saved but never
   sent to the AI — mirroring ServiceNow's real Work Notes vs. Additional Comments split.
3. Changing Impact/Urgency recalculates Priority server-side from the fixed matrix — no AI
   involved in that path at all.
4. Setting State → Resolved triggers a third, separate Claude call: a non-in-character "coach"
   prompt that scores the customer-visible transcript on clarity, empathy, technical accuracy, and
   whether the assigned priority matched the hidden true priority. A failed coaching call never
   blocks the resolution — grading is best-effort.

## ServiceNow terminology reference

- **Impact** — how broadly the issue affects the business (1-High, 2-Medium, 3-Low).
- **Urgency** — how quickly it needs to be fixed, independent of how many people it affects.
- **Priority** — derived from Impact × Urgency via a fixed lookup matrix, not set directly. This
  app implements ServiceNow's out-of-the-box priority matrix exactly:

  |                     | Urgency: High | Urgency: Medium | Urgency: Low |
  |---------------------|:---:|:---:|:---:|
  | **Impact: High**    | 1 – Critical | 2 – High     | 3 – Moderate |
  | **Impact: Medium**  | 2 – High     | 3 – Moderate | 4 – Low      |
  | **Impact: Low**     | 3 – Moderate | 4 – Low      | 4 – Low      |

  (See `backend/app/services/priority.py`.)

- **State** — incident lifecycle: New → In Progress → On Hold → Resolved → Closed. Coaching
  feedback fires automatically the moment State becomes Resolved.
- **Assignment Group** — the team responsible for the incident (e.g. Network Operations, Desktop
  Support). Randomly assigned at generation, editable like in ServiceNow.
- **Work Notes vs. Additional Comments** — Work Notes are internal-only; Additional Comments are
  customer-visible. A toggle under the chat box controls which one a message becomes, and only
  customer-visible messages are ever sent to the AI-played customer.

## Notes on the design

- The AI customer's system prompt explicitly tells it to stay in character, not resolve its own
  issue, and to vary mood/technical skill/clarity per scenario — so no two incidents play out quite
  the same way, and some are deliberately vague or meandering, like real end users.
- The hidden "true priority" is generated by the same call that creates the incident and stripped
  from every API response until the incident is Resolved, so it can't be seen while working the
  ticket.
- The coaching/evaluator call uses a separate, non-in-character system prompt and only ever sees
  the customer-visible transcript (never work notes), mirroring how a real QA reviewer would only
  see what the customer saw.

## Demo Mode

Setting `DEMO_MODE=true` runs the entire app on pre-written canned content instead of real Claude
API calls — no incident generation, chat reply, or coaching call ever touches the Anthropic API.
This is what powers the public demo above: it costs nothing regardless of traffic, and that
deployment doesn't have an `ANTHROPIC_API_KEY` configured at all.

- Incidents are drawn from a small pool of hand-written scenarios (`backend/app/services/demo_fixtures.py`)
- Chat replies cycle through generic in-character follow-up lines, still streamed word-by-word so
  the "customer is typing…" UI behaves identically to real mode
- Coaching feedback returns plausible scores and canned notes, but `prioritization_correct` is
  still computed for real against the scenario's true priority
- The frontend shows a small "Demo Mode" banner whenever the backend reports `demo_mode: true`
  (via `GET /health`)

## Running it locally

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

> **Switching to Postgres later:** install `psycopg2-binary`, point `DATABASE_URL` at a Postgres
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

1. Click **New incident** on the incident list — Claude invents a customer persona, an IT issue,
   a category, and a hidden "true" priority, then opens the chat with the customer's first message.
2. The left/top panel is the incident record (Impact, Urgency, auto-calculated Priority, State,
   Assignment Group, description). The right/bottom panel is the live chat.
3. Replying streams the AI persona's next reply back token-by-token, with a "customer is
   typing…" indicator.
4. Toggling **"Post as internal work note"** logs something for other agents instead of replying
   to the customer.
5. Adjusting Impact/Urgency recalculates Priority automatically.
6. Setting **State → Resolved** triggers the coaching evaluation; the feedback panel appears below
   the incident form once it's ready.

## Deploying a public demo

A minimal free-tier setup for a live, clickable link:

1. **Backend → Render.com** (free web service tier): point it at `backend/`, build command
   `pip install -r requirements.txt`, start command
   `alembic upgrade head && uvicorn app.main:app --host 0.0.0.0 --port $PORT`. Set env vars
   `DEMO_MODE=true` and `DATABASE_URL=sqlite:///./ticket_sim.db` — **do not** set
   `ANTHROPIC_API_KEY` there at all. Render's free disk is ephemeral, so SQLite data resets on
   redeploy/restart, which is desirable for a public demo.
2. **Frontend → Vercel** (free tier, native Next.js support): point it at `frontend/`, set
   `NEXT_PUBLIC_API_URL` to the Render backend's URL.
3. Back on Render, set `ALLOWED_ORIGINS` to the Vercel URL so the backend's CORS allows it.
4. Confirm by opening the Vercel URL in a private/incognito window and clicking through — the
   "Demo Mode" banner should appear, and creating/chatting/resolving an incident should work with
   no key configured anywhere in that environment.
