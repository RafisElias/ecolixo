from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.pickup_service import PickupService
from app.models.waste_category import WasteCategory
from app.schemas.pickup_service import PickupServiceCreate


async def list_services(db: AsyncSession, category_id: int | None = None):
    query = select(PickupService).options(selectinload(PickupService.categories))
    if category_id is not None:
        query = query.where(PickupService.categories.any(WasteCategory.id == category_id))
    result = await db.execute(query.order_by(PickupService.created_at.desc(), PickupService.id.desc()))
    return result.scalars().all()


async def get_service(db: AsyncSession, service_id: int):
    result = await db.execute(
        select(PickupService).where(PickupService.id == service_id)
        .options(selectinload(PickupService.categories))
    )
    service = result.scalar_one_or_none()
    if service is None:
        raise HTTPException(404, "Serviço não encontrado")
    return service


async def _categories(db: AsyncSession, ids: list[int]):
    result = await db.execute(select(WasteCategory).where(WasteCategory.id.in_(ids)))
    categories = list(result.scalars().all())
    if len(categories) != len(set(ids)):
        raise HTTPException(422, "Uma ou mais categorias são inválidas")
    return categories


async def _owned_service(db: AsyncSession, service_id: int, user_id: int):
    service = await get_service(db, service_id)
    if service.user_id != user_id:
        raise HTTPException(403, "Você só pode alterar seus próprios serviços")
    return service


async def save_service(db: AsyncSession, user_id: int, body: PickupServiceCreate, service_id: int | None = None):
    service = await _owned_service(db, service_id, user_id) if service_id is not None else PickupService(user_id=user_id)
    categories = await _categories(db, body.category_ids)
    for key, value in body.model_dump(exclude={"category_ids"}).items():
        setattr(service, key, value)
    service.categories = categories
    db.add(service)
    await db.commit()
    await db.refresh(service)
    await db.refresh(service, ["categories"])
    return service


async def delete_service(db: AsyncSession, service_id: int, user_id: int):
    service = await _owned_service(db, service_id, user_id)
    await db.delete(service)
    await db.commit()
