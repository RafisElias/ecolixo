from datetime import datetime
from pydantic import BaseModel
from app.models.disposal_point import PointStatus, ReviewStatus


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
    review_status: ReviewStatus = ReviewStatus.pending
    reviewed_at: datetime | None = None
    latitude: float
    longitude: float
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
