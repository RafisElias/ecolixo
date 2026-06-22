from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.user import User
from app.schemas.report import ReportCreate, ReportOut
from app.auth.jwt import require_manager
from app.services import report_service

router = APIRouter(prefix="/reports", tags=["reports"])


@router.post("", response_model=ReportOut, status_code=status.HTTP_201_CREATED)
async def generate_report(
    body: ReportCreate,
    db: AsyncSession = Depends(get_db),
    manager: User = Depends(require_manager),
):
    return await report_service.generate_report(db, manager, body)


@router.get("", response_model=list[ReportOut])
async def list_reports(
    db: AsyncSession = Depends(get_db),
    manager: User = Depends(require_manager),
):
    return await report_service.list_reports(db, manager)
