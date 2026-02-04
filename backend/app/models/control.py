from sqlalchemy import Integer, String
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.dialects.postgresql import JSONB
from .user import Base

class Control(Base):
    __tablename__ = "controls"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    result: Mapped[str] = mapped_column(String(20), default="conform")
    control_type: Mapped[str] = mapped_column(String(30), default="tematic")
    payload = mapped_column(JSONB, nullable=False)
