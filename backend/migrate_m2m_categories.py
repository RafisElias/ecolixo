"""Migração de category_id (FK única) para muitos-para-muitos.

Cria a tabela de junção disposal_point_categories, migra dados
existentes e remove a coluna antiga.

Uso:
    docker compose exec backend python migrate_m2m_categories.py
"""

import asyncio
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

from app.database import engine


MIGRATE_SQL = """
-- 1. Cria tabela de junção
CREATE TABLE IF NOT EXISTS disposal_point_categories (
    disposal_point_id   BIGINT NOT NULL REFERENCES disposal_points(id) ON DELETE CASCADE,
    category_id         BIGINT NOT NULL REFERENCES waste_categories(id) ON DELETE CASCADE,
    PRIMARY KEY (disposal_point_id, category_id)
);

-- 2. Migra dados existentes
INSERT INTO disposal_point_categories (disposal_point_id, category_id)
    SELECT id, category_id FROM disposal_points
    WHERE category_id IS NOT NULL
    AND NOT EXISTS (
        SELECT 1 FROM disposal_point_categories
        WHERE disposal_point_id = disposal_points.id
        AND category_id = disposal_points.category_id
    );

-- 3. Remove coluna antiga
ALTER TABLE disposal_points DROP COLUMN IF EXISTS category_id;
"""


async def migrate():
    print("🚀 Iniciando migração para muitos-para-muitos (categorias)...\n")
    async with engine.begin() as conn:
        for statement in MIGRATE_SQL.split(";"):
            stmt = statement.strip()
            if stmt:
                await conn.exec_driver_sql(stmt)
                print(f"  ✅ Executado: {stmt[:60]}...")
    print("\n✅ Migração concluída!")


if __name__ == "__main__":
    asyncio.run(migrate())
