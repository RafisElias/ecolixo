"""Esquema base: usuários, categorias, pontos de coleta, notificações, relatórios e serviços.

Reproduz o esquema que existia antes do Alembic (database/init.sql, a migração
manual migrate_m2m_categories.py e database/pickup_services.sql). Todos os
comandos são idempotentes, então a mesma migração cria um banco novo e também
adota um banco existente sem alterar dados.

Revision ID: 0001_baseline
Revises:
"""

from alembic import op

revision = "0001_baseline"
down_revision = None
branch_labels = None
depends_on = None

STATEMENTS = [
    "CREATE EXTENSION IF NOT EXISTS postgis",
    """
    DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_type') THEN
            CREATE TYPE user_type AS ENUM ('citizen', 'manager');
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'point_status') THEN
            CREATE TYPE point_status AS ENUM ('pending', 'under_review', 'resolved');
        END IF;
    END $$
    """,
    """
    CREATE TABLE IF NOT EXISTS users (
        id          BIGSERIAL PRIMARY KEY,
        name        TEXT NOT NULL,
        email       TEXT NOT NULL UNIQUE,
        password    TEXT NOT NULL,
        type        user_type NOT NULL DEFAULT 'citizen',
        created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS waste_categories (
        id          BIGSERIAL PRIMARY KEY,
        name        TEXT NOT NULL UNIQUE,
        description TEXT,
        map_color   TEXT NOT NULL DEFAULT '#FF5722'
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS disposal_points (
        id          BIGSERIAL PRIMARY KEY,
        user_id     BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        description TEXT,
        photo_url   TEXT,
        status      point_status NOT NULL DEFAULT 'pending',
        location    GEOGRAPHY(POINT, 4326) NOT NULL,
        created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS disposal_point_categories (
        disposal_point_id BIGINT NOT NULL REFERENCES disposal_points(id) ON DELETE CASCADE,
        category_id       BIGINT NOT NULL REFERENCES waste_categories(id) ON DELETE CASCADE,
        PRIMARY KEY (disposal_point_id, category_id)
    )
    """,
    # Bancos antigos guardavam uma única categoria em disposal_points.category_id.
    """
    DO $$ BEGIN
        IF EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'disposal_points' AND column_name = 'category_id'
        ) THEN
            INSERT INTO disposal_point_categories (disposal_point_id, category_id)
                SELECT id, category_id FROM disposal_points WHERE category_id IS NOT NULL
                ON CONFLICT DO NOTHING;
            ALTER TABLE disposal_points DROP COLUMN category_id;
        END IF;
    END $$
    """,
    "CREATE INDEX IF NOT EXISTS idx_disposal_location ON disposal_points USING GIST(location)",
    "CREATE INDEX IF NOT EXISTS idx_disposal_status ON disposal_points(status)",
    "CREATE INDEX IF NOT EXISTS idx_disposal_user ON disposal_points(user_id)",
    """
    CREATE TABLE IF NOT EXISTS notifications (
        id          BIGSERIAL PRIMARY KEY,
        user_id     BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        point_id    BIGINT NOT NULL REFERENCES disposal_points(id) ON DELETE CASCADE,
        message     TEXT NOT NULL,
        read        BOOLEAN NOT NULL DEFAULT FALSE,
        created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS reports (
        id              BIGSERIAL PRIMARY KEY,
        manager_id      BIGINT NOT NULL REFERENCES users(id),
        period_start    DATE NOT NULL,
        period_end      DATE NOT NULL,
        total_records   INT NOT NULL DEFAULT 0,
        data            JSONB,
        generated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
    """,
    """
    CREATE OR REPLACE FUNCTION update_timestamp() RETURNS TRIGGER AS $$
    BEGIN
        NEW.updated_at = NOW();
        RETURN NEW;
    END;
    $$ LANGUAGE plpgsql
    """,
    """
    DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_disposal_updated') THEN
            CREATE TRIGGER trg_disposal_updated BEFORE UPDATE ON disposal_points
                FOR EACH ROW EXECUTE FUNCTION update_timestamp();
        END IF;
    END $$
    """,
    """
    CREATE TABLE IF NOT EXISTS pickup_services (
        id            BIGSERIAL PRIMARY KEY,
        user_id       BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        name          VARCHAR(120) NOT NULL,
        provider_type VARCHAR(20) NOT NULL CHECK (provider_type IN ('individual', 'company')),
        contact       VARCHAR(200) NOT NULL,
        service_area  VARCHAR(200) NOT NULL,
        description   TEXT NOT NULL DEFAULT '',
        pricing       VARCHAR(20) NOT NULL CHECK (pricing IN ('free', 'paid', 'on_request')),
        created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
    """,
    "CREATE INDEX IF NOT EXISTS ix_pickup_services_user_id ON pickup_services(user_id)",
    """
    CREATE TABLE IF NOT EXISTS pickup_service_categories (
        service_id  BIGINT NOT NULL REFERENCES pickup_services(id) ON DELETE CASCADE,
        category_id BIGINT NOT NULL REFERENCES waste_categories(id),
        PRIMARY KEY (service_id, category_id)
    )
    """,
    # Referência pública aproximada, nunca inferida do endereço do usuário.
    "ALTER TABLE pickup_services ADD COLUMN IF NOT EXISTS reference_latitude DOUBLE PRECISION",
    "ALTER TABLE pickup_services ADD COLUMN IF NOT EXISTS reference_longitude DOUBLE PRECISION",
    "ALTER TABLE pickup_services ADD COLUMN IF NOT EXISTS radius_km DOUBLE PRECISION",
    """
    DO $$ BEGIN
        IF NOT EXISTS (
            SELECT 1 FROM pg_constraint
            WHERE conname = 'pickup_service_coverage_valid' AND conrelid = 'pickup_services'::regclass
        ) THEN
            ALTER TABLE pickup_services ADD CONSTRAINT pickup_service_coverage_valid CHECK (
                (reference_latitude IS NULL AND reference_longitude IS NULL AND radius_km IS NULL)
                OR (reference_latitude IS NOT NULL AND reference_longitude IS NOT NULL AND radius_km IS NOT NULL
                    AND reference_latitude BETWEEN -90 AND 90 AND reference_longitude BETWEEN -180 AND 180
                    AND radius_km BETWEEN 1 AND 100)
            );
        END IF;
    END $$
    """,
]


def upgrade() -> None:
    for statement in STATEMENTS:
        op.execute(statement)


def downgrade() -> None:
    raise NotImplementedError("O esquema base não é revertido; restaure um backup do banco.")
