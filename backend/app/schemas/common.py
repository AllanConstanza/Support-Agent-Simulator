from datetime import datetime, timezone

from pydantic import BaseModel, model_validator


class UTCModel(BaseModel):
    """Base schema that treats naive datetimes coming from SQLite as UTC.

    SQLite has no native timezone support, so timestamps written via
    SQLAlchemy's ``func.now()`` come back as naive datetimes representing
    UTC. Without this, Pydantic serializes them with no offset and the
    frontend's `new Date(...)` interprets them as local time instead.
    """

    @model_validator(mode="after")
    def _assume_utc_for_naive_datetimes(self):
        for name in self.__dict__:
            value = getattr(self, name)
            if isinstance(value, datetime) and value.tzinfo is None:
                setattr(self, name, value.replace(tzinfo=timezone.utc))
        return self
