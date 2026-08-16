from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.feedback import Feedback
from app.models.incident import Incident
from app.schemas.feedback import FeedbackOut
from app.services import anthropic_client

router = APIRouter(prefix="/incidents/{incident_id}/feedback", tags=["feedback"])


@router.post("", response_model=FeedbackOut)
def create_feedback(incident_id: int, db: Session = Depends(get_db)):
    incident = db.get(Incident, incident_id)
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")

    if incident.feedback:
        return _to_feedback_out(incident.feedback, incident)

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
        prioritization_correct=bool(result.get("prioritization_correct", incident.priority == incident.true_priority)),
        notes=result.get("notes", ""),
    )
    db.add(feedback)
    db.commit()
    db.refresh(feedback)
    db.refresh(incident)

    return _to_feedback_out(feedback, incident)


@router.get("", response_model=FeedbackOut)
def get_feedback(incident_id: int, db: Session = Depends(get_db)):
    incident = db.get(Incident, incident_id)
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")
    if not incident.feedback:
        raise HTTPException(status_code=404, detail="Feedback not yet generated")
    return _to_feedback_out(incident.feedback, incident)


def _to_feedback_out(feedback: Feedback, incident: Incident) -> FeedbackOut:
    return FeedbackOut(
        id=feedback.id,
        incident_id=feedback.incident_id,
        clarity_score=feedback.clarity_score,
        empathy_score=feedback.empathy_score,
        technical_accuracy_score=feedback.technical_accuracy_score,
        prioritization_correct=feedback.prioritization_correct,
        notes=feedback.notes,
        created_at=feedback.created_at,
        true_priority=incident.true_priority,
        assigned_priority=incident.priority,
    )
