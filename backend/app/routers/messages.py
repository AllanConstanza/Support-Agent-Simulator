import json

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.incident import Incident
from app.models.message import Message
from app.schemas.message import MessageCreate, MessageOut
from app.services import anthropic_client

router = APIRouter(prefix="/incidents/{incident_id}/messages", tags=["messages"])


@router.get("", response_model=list[MessageOut])
def list_messages(incident_id: int, db: Session = Depends(get_db)):
    incident = db.get(Incident, incident_id)
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")
    return incident.messages


def _build_history_for_persona(incident: Incident) -> list[dict]:
    """Builds the conversation history from the persona's point of view.

    The persona is the "assistant". The agent's customer-visible messages are "user" turns.
    Work notes are excluded — the AI persona never sees internal notes.
    """
    history: list[dict] = []
    for m in incident.messages:
        if m.is_work_note:
            continue
        role = "assistant" if m.sender == "client_ai" else "user"
        if history and history[-1]["role"] == role:
            history[-1]["content"] += f"\n{m.body}"
        else:
            history.append({"role": role, "content": m.body})
    return history


@router.post("")
async def post_message(incident_id: int, payload: MessageCreate, db: Session = Depends(get_db)):
    incident = db.get(Incident, incident_id)
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")

    agent_message = Message(
        incident_id=incident.id,
        sender="agent",
        body=payload.body,
        is_work_note=payload.is_work_note,
    )
    db.add(agent_message)
    db.commit()
    db.refresh(agent_message)

    if payload.is_work_note:
        # Internal notes are never sent to the AI persona; no reply is generated.
        return {"message": MessageOut.model_validate(agent_message).model_dump(mode="json"), "reply": None}

    history = _build_history_for_persona(incident)

    async def event_stream():
        full_reply = ""
        yield f"data: {json.dumps({'type': 'start'})}\n\n"
        try:
            async for chunk in anthropic_client.stream_persona_reply(incident, history):
                full_reply += chunk
                yield f"data: {json.dumps({'type': 'token', 'text': chunk})}\n\n"
        except Exception as exc:  # noqa: BLE001
            yield f"data: {json.dumps({'type': 'error', 'message': str(exc)})}\n\n"
            return

        reply_message = Message(
            incident_id=incident.id,
            sender="client_ai",
            body=full_reply,
            is_work_note=False,
        )
        db.add(reply_message)
        db.commit()
        db.refresh(reply_message)
        yield f"data: {json.dumps({'type': 'done', 'message_id': reply_message.id})}\n\n"

    return StreamingResponse(event_stream(), media_type="text/event-stream")
