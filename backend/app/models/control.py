from datetime import datetime
from typing import Any, Optional

from sqlalchemy import Integer, String, DateTime, ForeignKey, Index
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.dialects.postgresql import JSONB

from app.core.db import Base


class Control(Base):
    __tablename__ = "controls"

    # ------------------------
    # IDENTIFICARE
    # ------------------------
    id: Mapped[int] = mapped_column(Integer, primary_key=True)

    # ------------------------
    # METADATE
    # ------------------------
    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        nullable=False,
        index=True
    )

    created_by_user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id"),
        nullable=False,
        index=True
    )

    # ------------------------
    # CLASIFICARE CONTROL
    # ------------------------
    result: Mapped[str] = mapped_column(
        String(20),
        default="conform",
        nullable=False,
        index=True
    )

    control_type: Mapped[str] = mapped_column(
        String(30),
        default="tematic",
        nullable=False,
        index=True
    )

    # ------------------------
    # PAYLOAD FLEXIBIL
    # ------------------------
    payload: Mapped[dict[str, Any]] = mapped_column(
        JSONB,
        nullable=False
    )

    # ------------------------
    # SOFT DELETE
    # ------------------------
    deleted_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime,
        nullable=True,
        index=True
    )

    deleted_by_user_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("users.id"),
        nullable=True,
        index=True
    )

    # ------------------------
    # INDEXURI UTILE
    # ------------------------
    __table_args__ = (
        Index("idx_controls_created_by", "created_by_user_id"),
        Index("idx_controls_created_at", "created_at"),
        Index("idx_controls_result", "result"),
        Index("idx_controls_type", "control_type"),
        Index("idx_controls_deleted_at", "deleted_at"),
        Index("idx_controls_deleted_by", "deleted_by_user_id"),
    )