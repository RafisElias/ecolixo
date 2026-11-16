from datetime import datetime

from sqlalchemy import BigInteger, CheckConstraint, Column, DateTime, ForeignKey, Float, String, Table, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base

pickup_service_categories = Table(
    "pickup_service_categories",
    Base.metadata,
    Column("service_id", BigInteger, ForeignKey("pickup_services.id", ondelete="CASCADE"), primary_key=True),
    Column("category_id", BigInteger, ForeignKey("waste_categories.id"), primary_key=True),
)


class PickupService(Base):
    __tablename__ = "pickup_services"
    __table_args__ = (
        CheckConstraint("provider_type IN ('individual', 'company')"),
        CheckConstraint("pricing IN ('free', 'paid', 'on_request')"),
        CheckConstraint("(reference_latitude IS NULL AND reference_longitude IS NULL AND radius_km IS NULL) OR (reference_latitude IS NOT NULL AND reference_longitude IS NOT NULL AND radius_km IS NOT NULL AND reference_latitude BETWEEN -90 AND 90 AND reference_longitude BETWEEN -180 AND 180 AND radius_km BETWEEN 1 AND 100)", name="pickup_service_coverage_valid"),
    )

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    user_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("users.id", ondelete="CASCADE"), index=True)
    name: Mapped[str] = mapped_column(String(120))
    provider_type: Mapped[str] = mapped_column(String(20))
    contact: Mapped[str] = mapped_column(String(200))
    service_area: Mapped[str] = mapped_column(String(200))
    description: Mapped[str] = mapped_column(Text, default="")
    pricing: Mapped[str] = mapped_column(String(20))
    reference_latitude: Mapped[float | None] = mapped_column(Float)
    reference_longitude: Mapped[float | None] = mapped_column(Float)
    radius_km: Mapped[float | None] = mapped_column(Float)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    categories = relationship("WasteCategory", secondary=pickup_service_categories, lazy="selectin")
