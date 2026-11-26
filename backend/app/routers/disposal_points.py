from fastapi import APIRouter, Depends, File, Form, Query, UploadFile, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.jwt import get_current_user, require_manager
from app.database import get_db
from app.models.disposal_point import PointStatus, ReviewStatus
from app.models.user import User
from app.schemas.disposal_point import DisposalPointOut, DisposalPointStatusUpdate
from app.schemas.gamification import ReviewUpdate
from app.services import point_service
from app.services.rate_limit import enforce_point_limit

router = APIRouter(prefix="/points", tags=["disposal-points"])


@router.get("", response_model=list[DisposalPointOut])
async def list_points(
    status: PointStatus | None = Query(None),
    review_status: ReviewStatus | None = Query(None),
    category_id: int | None = Query(None),
    lat: float | None = Query(None, ge=-90, le=90),
    lon: float | None = Query(None, ge=-180, le=180),
    radius_km: float = Query(10.0, gt=0, le=500),
    # Área visível do mapa (todos os quatro ou nenhum).
    min_lat: float | None = Query(None, ge=-90, le=90),
    min_lon: float | None = Query(None, ge=-180, le=180),
    max_lat: float | None = Query(None, ge=-90, le=90),
    max_lon: float | None = Query(None, ge=-180, le=180),
    limit: int = Query(point_service.MAX_POINTS, ge=1, le=point_service.MAX_POINTS),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
    viewer: User = Depends(get_current_user),
):
    return await point_service.list_points(
        db,
        status_filter=status,
        review_status=review_status,
        category_id=category_id,
        lat=lat,
        lon=lon,
        radius_km=radius_km,
        viewer=viewer,
        bbox=point_service.parse_bbox(min_lat, min_lon, max_lat, max_lon),
        limit=limit,
        offset=offset,
    )


@router.post("", response_model=DisposalPointOut, status_code=status.HTTP_201_CREATED)
async def create_point(
    latitude: float = Form(..., ge=-90, le=90),
    longitude: float = Form(..., ge=-180, le=180),
    category_ids: str = Form("[]"),
    description: str | None = Form(None, max_length=2000),
    photo: UploadFile | None = File(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await enforce_point_limit(db, current_user.id)
    return await point_service.create_point(
        db,
        current_user,
        latitude,
        longitude,
        category_ids=category_ids,
        description=description,
        photo=photo,
    )


@router.patch("/{point_id}/status", response_model=DisposalPointOut)
async def update_status(
    point_id: int,
    body: DisposalPointStatusUpdate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_manager),
):
    return await point_service.update_point_status(db, point_id, body)


@router.patch("/{point_id}/review", response_model=DisposalPointOut)
async def review_point(
    point_id: int,
    body: ReviewUpdate,
    db: AsyncSession = Depends(get_db),
    manager: User = Depends(require_manager),
):
    return await point_service.review_point(db, point_id, manager, body)


@router.get("/heatmap")
async def heatmap(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    return await point_service.get_heatmap_data(db)
