from datetime import datetime

from pydantic import BaseModel, ConfigDict

from app.schemas.common import UTCModel


class IncidentListItem(UTCModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    number: str
    short_description: str
    priority: int
    state: str
    assignment_group: str
    created_at: datetime


class IncidentCreateResponse(UTCModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    number: str
    short_description: str
    description: str
    caller_name: str
    category: str
    subcategory: str
    impact: int
    urgency: int
    priority: int
    state: str
    assignment_group: str
    created_at: datetime
    # true_priority intentionally omitted


class IncidentDetail(IncidentCreateResponse):
    """Same shape as create response — true_priority stays hidden until resolved."""

    true_priority: int | None = None


class IncidentUpdate(BaseModel):
    impact: int | None = None
    urgency: int | None = None
    state: str | None = None
    assignment_group: str | None = None
