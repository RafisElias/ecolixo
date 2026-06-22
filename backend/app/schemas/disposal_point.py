from datetime import datetime
from pydantic import BaseModel, field_validator
from app.models.disposal_point import PointStatus


class DisposalPointCreate(BaseModel):
    latitude: float
    longitude: float
    category_ids: list[int] = []
    description: str | None = None

    @field_validator("latitude")
    @classmethod
    def validate_lat(cls, v: float) -> float:
        if not -90 <= v <= 90:
            raise ValueError("latitude must be between -90 and 90")
        return v

    @field_validator("longitude")
    @classmethod
    def validate_lon(cls, v: float) -> float:
        if not -180 <= v <= 180:
            raise ValueError("longitude must be between -180 and 180")
        return v


class DisposalPointStatusUpdate(BaseModel):
    status: PointStatus


class CategoryOut(BaseModel):
    id: int
    name: str
    map_color: str

    model_config = {"from_attributes": True}


class DisposalPointOut(BaseModel):
    id: int
    user_id: int
    categories: list[CategoryOut] = []
    description: str | None
    photo_url: str | None
    status: PointStatus
    latitude: float
    longitude: float
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
