import random

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.feedback import Feedback
from app.models.incident import Incident
from app.models.message import Message
from app.schemas.incident import (
    IncidentCreateResponse,
    IncidentDetail,
    IncidentListItem,
    IncidentUpdate,
)
from app.services import anthropic_client
from app.services.anthropic_client import ASSIGNMENT_GROUPS
from app.services.priority import calculate_priority

router = APIRouter(prefix="/incidents", tags=["incidents"])


def _next_incident_number(db: Session) -> str:
    count = db.execute(select(Incident)).scalars().all()
    next_id = len(count) + 10001
    return f"INC00{next_id}"


@router.post("", response_model=IncidentCreateResponse)
def create_incident(db: Session = Depends(get_db)):
    persona = anthropic_client.generate_incident_persona()

    impact = int(persona.get("suggested_impact", 2))
    urgency = int(persona.get("suggested_urgency", 2))
    impact = impact if impact in (1, 2, 3) else 2
    urgency = urgency if urgency in (1, 2, 3) else 2
    priority = calculate_priority(impact, urgency)
    true_priority = int(persona.get("true_priority", priority))
    true_priority = true_priority if true_priority in (1, 2, 3, 4) else priority

    incident = Incident(
        number=_next_incident_number(db),
        short_description=persona["short_description"][:255],
        description=persona["description"],
        caller_name=persona["caller_name"],
        category=persona.get("category", "Software"),
        subcategory=persona.get("subcategory", "Business Application"),
        impact=impact,
        urgency=urgency,
        priority=priority,
        true_priority=true_priority,
        state="New",
        assignment_group=random.choice(ASSIGNMENT_GROUPS),
    )
    db.add(incident)
    db.flush()

    opening_message = Message(
        incident_id=incident.id,
        sender="client_ai",
        body=persona["opening_message"],
        is_work_note=False,
    )
    db.add(opening_message)
    db.commit()
    db.refresh(incident)

    return incident


@router.get("", response_model=list[IncidentListItem])
def list_incidents(
    state: str | None = None,
    priority: int | None = None,
    sort_by: str = "created_at",
    order: str = "desc",
    db: Session = Depends(get_db),
):
    query = select(Incident)
    if state:
        query = query.where(Incident.state == state)
    if priority:
        query = query.where(Incident.priority == priority)

    sort_column = getattr(Incident, sort_by, Incident.created_at)
    query = query.order_by(sort_column.desc() if order == "desc" else sort_column.asc())

    return db.execute(query).scalars().all()


@router.get("/{incident_id}", response_model=IncidentDetail)
def get_incident(incident_id: int, db: Session = Depends(get_db)):
    incident = db.get(Incident, incident_id)
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")

    data = IncidentDetail.model_validate(incident)
    if incident.state not in ("Resolved", "Closed"):
        data.true_priority = None
    return data


@router.patch("/{incident_id}", response_model=IncidentDetail)
def update_incident(incident_id: int, update: IncidentUpdate, db: Session = Depends(get_db)):
    incident = db.get(Incident, incident_id)
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")

    if update.impact is not None:
        incident.impact = update.impact
    if update.urgency is not None:
        incident.urgency = update.urgency
    if update.impact is not None or update.urgency is not None:
        incident.priority = calculate_priority(incident.impact, incident.urgency)

    became_resolved = (
        update.state == "Resolved" and incident.state != "Resolved" and incident.feedback is None
    )

    if update.state is not None:
        incident.state = update.state
    if update.assignment_group is not None:
        incident.assignment_group = update.assignment_group

    db.commit()
    db.refresh(incident)

    if became_resolved:
        # Feedback generation is best-effort: the state transition itself must not
        # fail just because the coaching call errored (bad key, rate limit, etc).
        # The frontend polls GET /incidents/{id}/feedback and can retry via POST.
        try:
            transcript = [
                {"sender": m.sender, "body": m.body} for m in incident.messages if not m.is_work_note
            ]
            result = anthropic_client.evaluate_transcript(
                transcript=transcript,
                true_priority=incident.true_priority,
                assigned_priority=incident.priority,
            )
            feedback = Feedback(
                incident_id=incident.id,
                clarity_score=int(result.get("clarity_score", 3)),
                empathy_score=int(result.get("empathy_score", 3)),
                technical_accuracy_score=int(result.get("technical_accuracy_score", 3)),
                prioritization_correct=bool(
                    result.get("prioritization_correct", incident.priority == incident.true_priority)
                ),
                notes=result.get("notes", ""),
            )
            db.add(feedback)
            db.commit()
            db.refresh(incident)
        except Exception:  # noqa: BLE001
            db.rollback()

    data = IncidentDetail.model_validate(incident)
    if incident.state not in ("Resolved", "Closed"):
        data.true_priority = None
    return data
