from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.jwt import get_current_user
from app.database import get_db
from app.models.user import User
from app.schemas.gamification import JourneyOut, MissionAnswer, MissionOut, MissionResult
from app.services import gamification_service

router = APIRouter(prefix="/gamification", tags=["gamification"])


@router.get("/journey", response_model=JourneyOut)
async def journey(db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    return await gamification_service.get_journey(db, user.id)


@router.get("/missions", response_model=list[MissionOut])
async def missions(db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    return await gamification_service.list_missions(db, user.id)


@router.post("/missions/{mission_key}/complete", response_model=MissionResult)
async def complete_mission(
    mission_key: str,
    body: MissionAnswer,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    return await gamification_service.complete_mission(db, user.id, mission_key, body)
