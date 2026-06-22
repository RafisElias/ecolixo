CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE TYPE user_type AS ENUM ('citizen', 'manager');
CREATE TYPE point_status AS ENUM ('pending', 'under_review', 'resolved');

CREATE TABLE users (
    id          BIGSERIAL PRIMARY KEY,
    name        TEXT NOT NULL,
    email       TEXT NOT NULL UNIQUE,
    password    TEXT NOT NULL,
    type        user_type NOT NULL DEFAULT 'citizen',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE waste_categories (
    id          BIGSERIAL PRIMARY KEY,
    name        TEXT NOT NULL UNIQUE,
    description TEXT,
    map_color   TEXT NOT NULL DEFAULT '#FF5722'
);

CREATE TABLE disposal_points (
    id              BIGSERIAL PRIMARY KEY,
    user_id         BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    category_id     BIGINT REFERENCES waste_categories(id),
    description     TEXT,
    photo_url       TEXT,
    status          point_status NOT NULL DEFAULT 'pending',
    location        GEOGRAPHY(POINT, 4326) NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_disposal_location ON disposal_points USING GIST(location);
CREATE INDEX idx_disposal_status   ON disposal_points(status);
CREATE INDEX idx_disposal_category ON disposal_points(category_id);
CREATE INDEX idx_disposal_user     ON disposal_points(user_id);

CREATE TABLE notifications (
    id          BIGSERIAL PRIMARY KEY,
    user_id     BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    point_id    BIGINT NOT NULL REFERENCES disposal_points(id) ON DELETE CASCADE,
    message     TEXT NOT NULL,
    read        BOOLEAN NOT NULL DEFAULT FALSE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE reports (
    id              BIGSERIAL PRIMARY KEY,
    manager_id      BIGINT NOT NULL REFERENCES users(id),
    period_start    DATE NOT NULL,
    period_end      DATE NOT NULL,
    total_records   INT NOT NULL DEFAULT 0,
    data            JSONB,
    generated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_disposal_updated
BEFORE UPDATE ON disposal_points
FOR EACH ROW EXECUTE FUNCTION update_timestamp();
