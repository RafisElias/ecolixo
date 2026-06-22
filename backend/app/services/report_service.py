from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, cast, Date

from app.models.disposal_point import DisposalPoint, disposal_point_categories
from app.models.report import Report
from app.models.user import User
from app.schemas.report import ReportCreate


async def generate_report(
    db: AsyncSession, manager: User, body: ReportCreate
) -> Report:
    base_q = select(DisposalPoint).where(
        cast(DisposalPoint.created_at, Date) >= body.period_start,
        cast(DisposalPoint.created_at, Date) <= body.period_end,
    )

    total_res = await db.execute(select(func.count()).select_from(base_q.subquery()))
    total = total_res.scalar_one()

    by_status_res = await db.execute(
        select(DisposalPoint.status, func.count().label("n"))
        .where(
            cast(DisposalPoint.created_at, Date) >= body.period_start,
            cast(DisposalPoint.created_at, Date) <= body.period_end,
        )
        .group_by(DisposalPoint.status)
    )
    by_status = {row.status: row.n for row in by_status_res}

    by_category_res = await db.execute(
        select(disposal_point_categories.c.category_id, func.count().label("n"))
        .join(DisposalPoint, DisposalPoint.id == disposal_point_categories.c.disposal_point_id)
        .where(
            cast(DisposalPoint.created_at, Date) >= body.period_start,
            cast(DisposalPoint.created_at, Date) <= body.period_end,
        )
        .group_by(disposal_point_categories.c.category_id)
    )
    by_category = {str(row.category_id): row.n for row in by_category_res}

    report = Report(
        manager_id=manager.id,
        period_start=body.period_start,
        period_end=body.period_end,
        total_records=total,
        data={"by_status": by_status, "by_category": by_category},
    )
    db.add(report)
    await db.commit()
    await db.refresh(report)
    return report


async def list_reports(db: AsyncSession, manager: User) -> list[Report]:
    result = await db.execute(
        select(Report)
        .where(Report.manager_id == manager.id)
        .order_by(Report.generated_at.desc())
    )
    return result.scalars().all()
