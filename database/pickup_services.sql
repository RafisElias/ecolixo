-- Aditiva e idempotente: não altera nem remove dados existentes.
CREATE TABLE IF NOT EXISTS pickup_services (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(120) NOT NULL,
    provider_type VARCHAR(20) NOT NULL CHECK (provider_type IN ('individual', 'company')),
    contact VARCHAR(200) NOT NULL,
    service_area VARCHAR(200) NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    pricing VARCHAR(20) NOT NULL CHECK (pricing IN ('free', 'paid', 'on_request')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS ix_pickup_services_user_id ON pickup_services(user_id);
CREATE TABLE IF NOT EXISTS pickup_service_categories (
    service_id BIGINT NOT NULL REFERENCES pickup_services(id) ON DELETE CASCADE,
    category_id BIGINT NOT NULL REFERENCES waste_categories(id),
    PRIMARY KEY (service_id, category_id)
);

-- Referência pública aproximada, nunca inferida do endereço do usuário.
ALTER TABLE pickup_services ADD COLUMN IF NOT EXISTS reference_latitude DOUBLE PRECISION;
ALTER TABLE pickup_services ADD COLUMN IF NOT EXISTS reference_longitude DOUBLE PRECISION;
ALTER TABLE pickup_services ADD COLUMN IF NOT EXISTS radius_km DOUBLE PRECISION;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'pickup_service_coverage_valid' AND conrelid = 'pickup_services'::regclass) THEN
        ALTER TABLE pickup_services ADD CONSTRAINT pickup_service_coverage_valid CHECK (
            (reference_latitude IS NULL AND reference_longitude IS NULL AND radius_km IS NULL)
            OR (reference_latitude IS NOT NULL AND reference_longitude IS NOT NULL AND radius_km IS NOT NULL
                AND reference_latitude BETWEEN -90 AND 90 AND reference_longitude BETWEEN -180 AND 180
                AND radius_km BETWEEN 1 AND 100)
        );
    END IF;
END $$;
