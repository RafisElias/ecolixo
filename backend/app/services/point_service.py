import json
from typing import Sequence

from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, cast
from sqlalchemy.orm import selectinload
from geoalchemy2.functions import ST_MakePoint, ST_SetSRID, ST_DWithin

from geoalchemy2.types import Geometry as GeoGeometry

from app.models.disposal_point import DisposalPoint, PointStatus, disposal_point_categories
from app.models.notification import Notification
from app.models.waste_category import WasteCategory
from app.models.user import User
from app.schemas.disposal_point import DisposalPointOut, CategoryOut, DisposalPointStatusUpdate
from app.services.file_service import validate_and_save_photo

STATUS_LABELS = {
    "pending": "Pendente",
    "under_review": "Em análise",
    "resolved": "Resolvido",
}


def _make_location(lat: float, lon: float):
    return ST_SetSRID(ST_MakePoint(lon, lat), 4326)


def _point_to_dict(point: DisposalPoint, lat: float, lon: float) -> dict:
    return {
        "id": point.id,
        "user_id": point.user_id,
        "categories": [CategoryOut.model_validate(c).model_dump() for c in point.categories],
        "description": point.description,
        "photo_url": point.photo_url,
        "status": point.status,
        "latitude": lat,
        "longitude": lon,
        "created_at": point.created_at,
        "updated_at": point.updated_at,
    }


def _to_out(point: DisposalPoint, lat: float, lon: float) -> DisposalPointOut:
    return DisposalPointOut.model_validate(_point_to_dict(point, lat, lon))


async def _fetch_coords(point: DisposalPoint, db: AsyncSession) -> tuple[float, float]:
    loc = cast(point.location, GeoGeometry)
    result = await db.execute(
        select(func.ST_Y(loc).label("lat"), func.ST_X(loc).label("lon"))
    )
    row = result.one()
    return row.lat, row.lon


async def list_points(
    db: AsyncSession,
    status_filter: PointStatus | None = None,
    category_id: int | None = None,
    lat: float | None = None,
    lon: float | None = None,
    radius_km: float = 10.0,
) -> list[DisposalPointOut]:
    loc = cast(DisposalPoint.location, GeoGeometry)
    q = select(
        DisposalPoint,
        func.ST_X(loc).label("lon"),
        func.ST_Y(loc).label("lat"),
    ).options(selectinload(DisposalPoint.categories))

    if status_filter:
        q = q.where(DisposalPoint.status == status_filter)
    if category_id:
        q = q.where(
            DisposalPoint.id.in_(
                select(disposal_point_categories.c.disposal_point_id).where(
                    disposal_point_categories.c.category_id == category_id
                )
            )
        )
    if lat is not None and lon is not None:
        point_geog = ST_SetSRID(ST_MakePoint(lon, lat), 4326)
        q = q.where(ST_DWithin(DisposalPoint.location, point_geog, radius_km * 1000))

    result = await db.execute(q.order_by(DisposalPoint.created_at.desc()))
    rows = result.all()
    return [_to_out(row[0], row.lat, row.lon) for row in rows]


async def create_point(
    db: AsyncSession,
    current_user: User,
    latitude: float,
    longitude: float,
    category_ids: str = "[]",
    description: str | None = None,
    photo=None,
) -> DisposalPointOut:
    try:
        cat_ids = json.loads(category_ids)
    except json.JSONDecodeError:
        cat_ids = []

    photo_url = validate_and_save_photo(photo)

    categories: Sequence[WasteCategory] = []
    if cat_ids:
        result = await db.execute(
            select(WasteCategory).where(WasteCategory.id.in_(cat_ids))
        )
        categories = result.scalars().all()

    point = DisposalPoint(
        user_id=current_user.id,
        description=description,
        photo_url=photo_url,
        location=_make_location(latitude, longitude),
        categories=list(categories),
    )
    db.add(point)
    await db.commit()
    await db.refresh(point)
    await db.refresh(point, ["categories"])

    lat, lon = await _fetch_coords(point, db)
    return _to_out(point, lat, lon)


async def update_point_status(
    db: AsyncSession, point_id: int, body: DisposalPointStatusUpdate
) -> DisposalPointOut:
    result = await db.execute(
        select(DisposalPoint)
        .where(DisposalPoint.id == point_id)
        .options(selectinload(DisposalPoint.categories))
    )
    point = result.scalar_one_or_none()
    if not point:
        raise HTTPException(status_code=404, detail="Point not found")

    point.status = body.status
    await db.flush()

    notif = Notification(
        user_id=point.user_id,
        point_id=point.id,
        message=f"Seu registro #{point.id} foi atualizado para: {STATUS_LABELS.get(body.status, body.status)}.",
    )
    db.add(notif)
    await db.commit()
    await db.refresh(point)
    await db.refresh(point, ["categories"])

    lat, lon = await _fetch_coords(point, db)
    return _to_out(point, lat, lon)


async def get_heatmap_data(db: AsyncSession) -> list[list[float]]:
    loc = cast(DisposalPoint.location, GeoGeometry)
    result = await db.execute(
        select(
            func.ST_Y(loc).label("lat"),
            func.ST_X(loc).label("lon"),
        )
    )
    rows = result.all()
    return [[r.lat, r.lon, 1.0] for r in rows]
