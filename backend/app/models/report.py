from sqlalchemy import BigInteger, Text, Date, Integer, DateTime, ForeignKey, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base


class Report(Base):
    __tablename__ = "reports"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    manager_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("users.id"), nullable=False)
    period_start: Mapped[Date] = mapped_column(Date, nullable=False)
    period_end: Mapped[Date] = mapped_column(Date, nullable=False)
    total_records: Mapped[int] = mapped_column(Integer, default=0)
    data = mapped_column(JSONB)
    generated_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    manager = relationship("User", back_populates="reports")
