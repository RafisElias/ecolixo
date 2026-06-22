import enum
from sqlalchemy import BigInteger, Text, Enum, DateTime, ForeignKey, Table, Column, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from geoalchemy2 import Geography
from app.database import Base


class PointStatus(str, enum.Enum):
    pending = "pending"
    under_review = "under_review"
    resolved = "resolved"


# Tabela de junção muitos-para-muitos
disposal_point_categories = Table(
    "disposal_point_categories",
    Base.metadata,
    Column("disposal_point_id", BigInteger, ForeignKey("disposal_points.id", ondelete="CASCADE"), primary_key=True),
    Column("category_id", BigInteger, ForeignKey("waste_categories.id", ondelete="CASCADE"), primary_key=True),
)


class DisposalPoint(Base):
    __tablename__ = "disposal_points"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    user_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    description: Mapped[str | None] = mapped_column(Text)
    photo_url: Mapped[str | None] = mapped_column(Text)
    status: Mapped[PointStatus] = mapped_column(
        Enum(PointStatus, name="point_status"), default=PointStatus.pending
    )
    location = mapped_column(Geography(geometry_type="POINT", srid=4326), nullable=False)
    created_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[DateTime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    user = relationship("User", back_populates="disposal_points")
    categories = relationship("WasteCategory", secondary=disposal_point_categories, back_populates="disposal_points")
    notifications = relationship("Notification", back_populates="point", cascade="all, delete-orphan")
