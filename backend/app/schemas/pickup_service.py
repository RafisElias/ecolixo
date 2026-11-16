from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, model_validator

from app.schemas.disposal_point import CategoryOut


class PickupServiceCreate(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True, extra="forbid")

    name: str = Field(min_length=2, max_length=120)
    provider_type: Literal["individual", "company"]
    contact: str = Field(min_length=5, max_length=200)
    service_area: str = Field(min_length=3, max_length=200)
    description: str = Field(default="", max_length=2000)
    pricing: Literal["free", "paid", "on_request"]
    category_ids: list[int] = Field(min_length=1, max_length=50)
    reference_latitude: float | None = Field(default=None, ge=-90, le=90, allow_inf_nan=False)
    reference_longitude: float | None = Field(default=None, ge=-180, le=180, allow_inf_nan=False)
    radius_km: float | None = Field(default=None, ge=1, le=100, allow_inf_nan=False)

    @model_validator(mode="after")
    def validate_coverage(self):
        values = (self.reference_latitude, self.reference_longitude, self.radius_km)
        if any(value is not None for value in values) and not all(value is not None for value in values):
            raise ValueError("Informe latitude, longitude e raio juntos, ou deixe todos vazios")
        return self


class PickupServiceOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    name: str
    provider_type: str
    contact: str
    service_area: str
    description: str
    pricing: str
    categories: list[CategoryOut]
    reference_latitude: float | None
    reference_longitude: float | None
    radius_km: float | None
    created_at: datetime
    updated_at: datetime
