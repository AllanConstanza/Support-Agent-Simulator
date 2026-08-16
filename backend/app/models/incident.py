from datetime import datetime

from sqlalchemy import DateTime, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Incident(Base):
    __tablename__ = "incidents"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    number: Mapped[str] = mapped_column(String(20), unique=True, index=True)

    short_description: Mapped[str] = mapped_column(String(255))
    description: Mapped[str] = mapped_column(Text)

    caller_name: Mapped[str] = mapped_column(String(120))
    category: Mapped[str] = mapped_column(String(80))
    subcategory: Mapped[str] = mapped_column(String(80))

    impact: Mapped[int] = mapped_column(Integer, default=2)
    urgency: Mapped[int] = mapped_column(Integer, default=2)
    priority: Mapped[int] = mapped_column(Integer, default=3)

    # Hidden from the UI until the incident is resolved.
    true_priority: Mapped[int] = mapped_column(Integer)

    state: Mapped[str] = mapped_column(String(20), default="New")
    assignment_group: Mapped[str] = mapped_column(String(80))

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    messages = relationship(
        "Message", back_populates="incident", cascade="all, delete-orphan", order_by="Message.created_at"
    )
    feedback = relationship(
        "Feedback", back_populates="incident", cascade="all, delete-orphan", uselist=False
    )
