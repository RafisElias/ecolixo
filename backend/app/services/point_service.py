import json
from collections.abc import Sequence

from fastapi import HTTPException
from geoalchemy2.functions import ST_DWithin, ST_MakePoint, ST_SetSRID
from geoalchemy2.types import Geometry as GeoGeometry
from sqlalchemy import cast, func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.disposal_point import DisposalPoint, PointStatus, ReviewStatus, disposal_point_categories
from app.models.notification import Notification
from app.models.user import User, UserType
from app.models.waste_category import WasteCategory
from app.schemas.disposal_point import CategoryOut, DisposalPointOut, DisposalPointStatusUpdate
from app.schemas.gamification import ReviewUpdate
from app.services import gamification_service
from app.services.file_service import save_photo, validate_photo

STATUS_LABELS = {
    "pending": "Pendente",
    "under_review": "Em análise",
    "resolved": "Resolvido",
}

REVIEW_MESSAGES = {
    "approved": "foi aprovado pela gestão. Obrigado por contribuir com o mapa!",
    "rejected": "não foi aprovado pela gestão após revisão.",
    "pending": "voltou para revisão pela gestão.",
}


MAX_POINTS = 2000


def parse_bbox(
    min_lat: float | None, min_lon: float | None, max_lat: float | None, max_lon: float | None
) -> tuple[float, float, float, float] | None:
    values = (min_lat, min_lon, max_lat, max_lon)
    if all(v is None for v in values):
        return None
    if any(v is None for v in values):
        raise HTTPException(status_code=422, detail="Informe min_lat, min_lon, max_lat e max_lon juntos")
    if min_lat > max_lat or min_lon > max_lon:
        raise HTTPException(status_code=422, detail="A área informada é inválida")
    return min_lat, min_lon, max_lat, max_lon


def _is_manager(user: User | None) -> bool:
    return user is not None and user.type == UserType.manager


def _parse_category_ids(raw: str) -> list[int]:
    try:
        ids = json.loads(raw)
    except json.JSONDecodeError:
        ids = None
    if not isinstance(ids, list) or not all(isinstance(i, int) and not isinstance(i, bool) for i in ids):
        raise HTTPException(status_code=422, detail="category_ids deve ser uma lista JSON de números inteiros")
    return list(dict.fromkeys(ids))


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
        "review_status": point.review_status,
        "reviewed_at": point.reviewed_at,
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
    review_status: ReviewStatus | None = None,
    category_id: int | None = None,
    lat: float | None = None,
    lon: float | None = None,
    radius_km: float = 10.0,
    viewer: User | None = None,
    bbox: tuple[float, float, float, float] | None = None,
    limit: int = MAX_POINTS,
    offset: int = 0,
) -> list[DisposalPointOut]:
    loc = cast(DisposalPoint.location, GeoGeometry)
    q = select(
        DisposalPoint,
        func.ST_X(loc).label("lon"),
        func.ST_Y(loc).label("lat"),
    ).options(selectinload(DisposalPoint.categories))

    if status_filter:
        q = q.where(DisposalPoint.status == status_filter)
    if review_status:
        q = q.where(DisposalPoint.review_status == review_status.value)
    if bbox is not None:
        min_lat, min_lon, max_lat, max_lon = bbox
        q = q.where(func.ST_Intersects(loc, func.ST_MakeEnvelope(min_lon, min_lat, max_lon, max_lat, 4326)))
    if not _is_manager(viewer):
        # Registros rejeitados pela revisão não aparecem no mapa público.
        q = q.where(DisposalPoint.review_status != ReviewStatus.rejected.value)
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

    result = await db.execute(
        q.order_by(DisposalPoint.created_at.desc(), DisposalPoint.id.desc()).limit(limit).offset(offset)
    )
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
    cat_ids = _parse_category_ids(category_ids)
    categories: Sequence[WasteCategory] = []
    if cat_ids:
        result = await db.execute(
            select(WasteCategory).where(WasteCategory.id.in_(cat_ids))
        )
        categories = result.scalars().all()
        if len(categories) != len(cat_ids):
            raise HTTPException(status_code=422, detail="Uma ou mais categorias são inválidas")

    # Grava a foto só depois de validar todo o resto, para não deixar arquivos órfãos.
    photo_url = save_photo(validate_photo(photo))

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
        raise HTTPException(status_code=404, detail="Ponto de coleta não encontrado")

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


async def review_point(
    db: AsyncSession, point_id: int, reviewer: User, body: ReviewUpdate
) -> DisposalPointOut:
    # Bloqueia a linha para serializar revisões concorrentes do mesmo ponto.
    result = await db.execute(
        select(DisposalPoint)
        .where(DisposalPoint.id == point_id)
        .options(selectinload(DisposalPoint.categories))
        .with_for_update(of=DisposalPoint)
    )
    point = result.scalar_one_or_none()
    if not point:
        raise HTTPException(status_code=404, detail="Ponto de coleta não encontrado")
    if point.user_id == reviewer.id:
        raise HTTPException(status_code=403, detail="Gestores não podem revisar a própria contribuição")

    new_status = body.review_status.value
    changed = point.review_status != new_status
    point.review_status = new_status
    if new_status == ReviewStatus.pending.value:
        point.reviewed_by, point.reviewed_at = None, None
    elif changed:
        point.reviewed_by, point.reviewed_at = reviewer.id, func.now()

    await gamification_service.sync_contribution_score(db, point)
    if changed:
        db.add(Notification(
            user_id=point.user_id,
            point_id=point.id,
            message=f"Seu registro #{point.id} {REVIEW_MESSAGES[new_status]}",
        ))
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
        ).where(DisposalPoint.review_status != ReviewStatus.rejected.value)
    )
    rows = result.all()
    return [[r.lat, r.lon, 1.0] for r in rows]
