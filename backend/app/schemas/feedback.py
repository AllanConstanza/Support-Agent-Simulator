from datetime import datetime

from pydantic import BaseModel, ConfigDict

from app.schemas.common import UTCModel


class FeedbackOut(UTCModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    incident_id: int
    clarity_score: int
    empathy_score: int
    technical_accuracy_score: int
    prioritization_correct: bool
    notes: str
    created_at: datetime
    true_priority: int
    assigned_priority: int
