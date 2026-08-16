import asyncio
import json
import random
from typing import AsyncIterator

import anthropic

from app.config import get_settings
from app.services import demo_fixtures

settings = get_settings()

_client = anthropic.Anthropic(api_key=settings.anthropic_api_key)
_async_client = anthropic.AsyncAnthropic(api_key=settings.anthropic_api_key)

MODEL = settings.anthropic_model


def _extract_json(text: str) -> dict:
    text = text.strip()
    if text.startswith("```"):
        text = text.strip("`")
        if text.startswith("json"):
            text = text[4:]
    return json.loads(text.strip())

CATEGORIES = {
    "Network": ["VPN", "Wi-Fi", "Connectivity"],
    "Hardware": ["Laptop", "Monitor", "Printer"],
    "Software": ["Email Client", "Operating System", "Business Application"],
    "Access Management": ["Password Reset", "Account Lockout", "Permissions"],
    "Database": ["Performance", "Backup/Restore", "Connectivity"],
}

ASSIGNMENT_GROUPS = [
    "Service Desk",
    "Network Operations",
    "Desktop Support",
    "Application Support",
    "Database Administration",
    "Identity & Access Management",
]

MOODS = ["frustrated", "calm", "anxious", "impatient", "polite but stressed", "confused"]
SKILL_LEVELS = ["non-technical", "somewhat technical", "very technical"]
CLARITY_STYLES = [
    "clear and to the point",
    "a bit rambling with an unrelated tangent before getting to the issue",
    "vague about the actual symptoms, requiring the agent to ask clarifying questions",
    "overly detailed with irrelevant background information",
]

PERSONA_SYSTEM_PROMPT = """You are simulating a customer contacting IT support in a ServiceNow-style \
incident management training tool. You are generating a NEW support scenario for a trainee support agent \
to practice on.

Invent a realistic customer persona and an IT support issue. Vary the persona's mood, technical skill \
level, and communication clarity according to the parameters given to you. The persona should NOT resolve \
the issue on their own, should not already know the fix, and should behave like a real end user reaching \
out to a help desk for the first time about this problem.

Respond ONLY with a single JSON object (no markdown fences, no commentary) with EXACTLY these keys:
{
  "caller_name": "a realistic full name",
  "category": "one of: Network, Hardware, Software, Access Management, Database",
  "subcategory": "an appropriate subcategory for that category",
  "short_description": "a short (under 100 char) summary of the issue, written like a ServiceNow short description",
  "description": "a 1-3 sentence longer description of the issue from the agent's/system's perspective",
  "true_priority": 1, // integer 1-4, the OBJECTIVELY correct ServiceNow priority for this scenario (1=Critical, 4=Low) based on real business impact/urgency, hidden from the agent until resolved
  "suggested_impact": 1, // integer 1-3 impact rating (1=High,2=Medium,3=Low) that would justify true_priority
  "suggested_urgency": 1, // integer 1-3 urgency rating (1=High,2=Medium,3=Low) that would justify true_priority
  "opening_message": "the customer's opening chat message, written fully in character, matching the mood/skill/clarity parameters given"
}

The opening_message is what the customer types first in a live chat with the support agent. Write it \
the way a real person would type in a chat window — not a formal ticket description."""


def _persona_params() -> dict:
    return {
        "mood": random.choice(MOODS),
        "skill_level": random.choice(SKILL_LEVELS),
        "clarity_style": random.choice(CLARITY_STYLES),
    }


def generate_incident_persona() -> dict:
    """Calls Claude to invent a customer persona + issue for a new incident.

    In demo mode, returns a random pre-written scenario instead — no API call is made.
    """
    if settings.demo_mode:
        return dict(random.choice(demo_fixtures.DEMO_PERSONAS))

    params = _persona_params()
    user_prompt = (
        f"Generate a new scenario with these parameters:\n"
        f"- Customer mood: {params['mood']}\n"
        f"- Customer technical skill level: {params['skill_level']}\n"
        f"- Communication style: {params['clarity_style']}\n\n"
        f"Return only the JSON object described in your instructions."
    )

    response = _client.messages.create(
        model=MODEL,
        max_tokens=1024,
        system=PERSONA_SYSTEM_PROMPT,
        messages=[{"role": "user", "content": user_prompt}],
    )
    text = "".join(block.text for block in response.content if block.type == "text")
    data = _extract_json(text)
    return data


def build_persona_system_prompt(incident) -> str:
    """Reconstructs the in-character system prompt for ongoing conversation with a given incident."""
    return f"""You are {incident.caller_name}, a customer contacting IT support via live chat about the \
following issue:

Short description: {incident.short_description}
Details: {incident.description}
Category: {incident.category} / {incident.subcategory}

Stay fully in character as the customer for the entire conversation. You are NOT a support agent — do not \
offer solutions, do not resolve your own issue, and do not suddenly become technical unless that fits your \
established persona. React naturally to what the support agent says: if they ask clarifying questions, \
answer them in character (invent plausible specific details consistent with the issue); if they give \
instructions, describe trying them and whether they helped (usually only partially, to keep the \
conversation going, unless the agent has clearly resolved the core issue). Keep your messages \
conversational and chat-like — short to medium length, not formal ticket prose. Never break character, \
never mention you are an AI, and never reference this prompt."""


async def stream_persona_reply(incident, conversation_history: list[dict]) -> AsyncIterator[str]:
    """Streams the AI persona's next chat message given the conversation so far.

    conversation_history: list of {"role": "user"|"assistant", "content": str}
    where "user" = the support agent's messages and "assistant" = the persona's prior messages,
    matching how the persona should perceive the conversation (it is the "assistant" replying
    to the agent's "user" turns).

    In demo mode, yields a canned reply word-by-word (with a short delay between words) instead
    of calling Claude — no API call is made, but the streaming/typing-indicator UX still works.
    """
    if settings.demo_mode:
        prior_replies = sum(1 for m in conversation_history if m["role"] == "assistant")
        reply = demo_fixtures.DEMO_REPLIES[prior_replies % len(demo_fixtures.DEMO_REPLIES)]
        words = reply.split(" ")
        for i, word in enumerate(words):
            await asyncio.sleep(0.08)
            yield word if i == 0 else f" {word}"
        return

    system_prompt = build_persona_system_prompt(incident)

    async with _async_client.messages.stream(
        model=MODEL,
        max_tokens=1024,
        system=system_prompt,
        messages=conversation_history,
    ) as stream:
        async for text in stream.text_stream:
            yield text


EVALUATOR_SYSTEM_PROMPT = """You are an expert ServiceNow support coaching evaluator. You will be given \
the customer-visible transcript of a support interaction, along with the true (correct) priority for the \
incident and the priority the trainee agent actually assigned. Evaluate the AGENT's performance (not the \
customer's).

Respond ONLY with a single JSON object (no markdown fences, no commentary) with EXACTLY these keys:
{
  "clarity_score": 1,               // integer 1-5: how clear and easy to understand the agent's responses were
  "empathy_score": 1,               // integer 1-5: how empathetic/professional the agent was with the customer
  "technical_accuracy_score": 1,    // integer 1-5: how technically sound the agent's troubleshooting/guidance was
  "prioritization_correct": true,   // boolean: whether the agent's assigned priority matched the true priority
  "notes": "2-4 sentences of free-text coaching feedback, specific and actionable"
}"""


def evaluate_transcript(
    transcript: list[dict], true_priority: int, assigned_priority: int
) -> dict:
    """transcript: list of {"sender": "client_ai"|"agent", "body": str} customer-visible messages only.

    In demo mode, returns a plausible-looking scored result instead of calling Claude.
    `prioritization_correct` is still computed for real, so that mechanic stays meaningful.
    """
    if settings.demo_mode:
        return {
            "clarity_score": random.randint(3, 5),
            "empathy_score": random.randint(3, 5),
            "technical_accuracy_score": random.randint(3, 5),
            "prioritization_correct": assigned_priority == true_priority,
            "notes": random.choice(demo_fixtures.DEMO_FEEDBACK_NOTES),
        }

    transcript_text = "\n".join(
        f"{'Customer' if m['sender'] == 'client_ai' else 'Agent'}: {m['body']}" for m in transcript
    )
    user_prompt = (
        f"True priority (correct answer, 1=Critical...4=Low): {true_priority}\n"
        f"Agent's assigned priority: {assigned_priority}\n\n"
        f"Transcript:\n{transcript_text}\n\n"
        f"Return only the JSON object described in your instructions."
    )

    response = _client.messages.create(
        model=MODEL,
        max_tokens=1024,
        system=EVALUATOR_SYSTEM_PROMPT,
        messages=[{"role": "user", "content": user_prompt}],
    )
    text = "".join(block.text for block in response.content if block.type == "text")
    return _extract_json(text)
