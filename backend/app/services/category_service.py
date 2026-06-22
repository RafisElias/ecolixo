from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.waste_category import WasteCategory


async def list_categories(db: AsyncSession) -> list[WasteCategory]:
    result = await db.execute(select(WasteCategory).order_by(WasteCategory.name))
    return result.scalars().all()
