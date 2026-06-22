from datetime import date, datetime
from pydantic import BaseModel


class ReportCreate(BaseModel):
    period_start: date
    period_end: date


class ReportOut(BaseModel):
    id: int
    manager_id: int
    period_start: date
    period_end: date
    total_records: int
    data: dict | None
    generated_at: datetime

    model_config = {"from_attributes": True}
