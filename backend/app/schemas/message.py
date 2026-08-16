from datetime import datetime

from pydantic import BaseModel, ConfigDict

from app.schemas.common import UTCModel


class MessageCreate(BaseModel):
    body: str
    is_work_note: bool = False


class MessageOut(UTCModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    incident_id: int
    sender: str
    body: str
    is_work_note: bool
    created_at: datetime
