from sqlalchemy import BigInteger, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base


class WasteCategory(Base):
    __tablename__ = "waste_categories"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    name: Mapped[str] = mapped_column(Text, nullable=False, unique=True)
    description: Mapped[str | None] = mapped_column(Text)
    map_color: Mapped[str] = mapped_column(Text, default="#FF5722")

    disposal_points = relationship("DisposalPoint", secondary="disposal_point_categories", back_populates="categories")
