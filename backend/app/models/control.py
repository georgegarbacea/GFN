from sqlalchemy import Integer, String, DateTime, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.dialects.postgresql import JSONB
from datetime import datetime
from app.core.db import Base

class Control(Base):
    __tablename__ = "controls"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)

    created_by_user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)

    result: Mapped[str] = mapped_column(String(20), default="conform", nullable=False)
    control_type: Mapped[str] = mapped_column(String(30), default="tematic", nullable=False)

    payload = mapped_column(JSONB, nullable=False)
