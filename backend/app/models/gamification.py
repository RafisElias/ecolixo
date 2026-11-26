from datetime import datetime

from sqlalchemy import BigInteger, CheckConstraint, DateTime, ForeignKey, Index, Integer, String, func, text
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class MissionCompletion(Base):
    __tablename__ = "mission_completions"

    user_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    mission_key: Mapped[str] = mapped_column(String(60), primary_key=True)
    completed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


POINTS_MISSION = 10
POINTS_CONTRIBUTION = 30


class ScoreEvent(Base):
    __tablename__ = "score_events"
    __table_args__ = (
        CheckConstraint("reason IN ('mission_completed', 'contribution_approved')"),
        CheckConstraint("points > 0"),
        Index(
            "score_events_active_once",
            "user_id",
            "reason",
            "source_key",
            unique=True,
            postgresql_where=text("revoked_at IS NULL"),
        ),
    )

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    user_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    reason: Mapped[str] = mapped_column(String(40), nullable=False)
    source_key: Mapped[str] = mapped_column(String(80), nullable=False)
    points: Mapped[int] = mapped_column(Integer, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    revoked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
