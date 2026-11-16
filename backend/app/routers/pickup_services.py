from fastapi import APIRouter, Depends, Query, Response
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.jwt import get_current_user
from app.database import get_db
from app.models.user import User
from app.schemas.pickup_service import PickupServiceCreate, PickupServiceOut
from app.services import pickup_service

router = APIRouter(prefix="/pickup-services", tags=["pickup-services"])


@router.get("", response_model=list[PickupServiceOut])
async def list_services(
    category_id: int | None = Query(None, gt=0),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    return await pickup_service.list_services(db, category_id)


@router.get("/{service_id}", response_model=PickupServiceOut)
async def get_service(
    service_id: int,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    return await pickup_service.get_service(db, service_id)


@router.post("", response_model=PickupServiceOut, status_code=201)
async def create_service(
    body: PickupServiceCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    return await pickup_service.save_service(db, user.id, body)


@router.put("/{service_id}", response_model=PickupServiceOut)
async def update_service(
    service_id: int,
    body: PickupServiceCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    return await pickup_service.save_service(db, user.id, body, service_id)


@router.delete("/{service_id}", status_code=204)
async def delete_service(
    service_id: int,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    await pickup_service.delete_service(db, service_id, user.id)
    return Response(status_code=204)
