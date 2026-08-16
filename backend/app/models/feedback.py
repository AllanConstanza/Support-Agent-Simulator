from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Feedback(Base):
    __tablename__ = "feedback"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    incident_id: Mapped[int] = mapped_column(ForeignKey("incidents.id"), unique=True, index=True)

    clarity_score: Mapped[int] = mapped_column(Integer)
    empathy_score: Mapped[int] = mapped_column(Integer)
    technical_accuracy_score: Mapped[int] = mapped_column(Integer)
    prioritization_correct: Mapped[bool] = mapped_column(Boolean)
    notes: Mapped[str] = mapped_column(Text)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    incident = relationship("Incident", back_populates="feedback")
