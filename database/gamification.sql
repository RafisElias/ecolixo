-- Gamificação: aditiva e idempotente; não altera nem remove dados existentes.

-- Revisão da contribuição, separada do status operacional herdado do ponto.
ALTER TABLE disposal_points ADD COLUMN IF NOT EXISTS review_status VARCHAR(20) NOT NULL DEFAULT 'pending';
ALTER TABLE disposal_points ADD COLUMN IF NOT EXISTS reviewed_by BIGINT REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE disposal_points ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'disposal_point_review_status_valid' AND conrelid = 'disposal_points'::regclass) THEN
        ALTER TABLE disposal_points ADD CONSTRAINT disposal_point_review_status_valid
            CHECK (review_status IN ('pending', 'approved', 'rejected'));
    END IF;
END $$;

-- Uma conclusão por usuário e missão; o conteúdo das missões fica versionado no código.
CREATE TABLE IF NOT EXISTS mission_completions (
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    mission_key VARCHAR(60) NOT NULL,
    completed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (user_id, mission_key)
);

-- Histórico auditável: o saldo é a soma dos eventos não revogados.
CREATE TABLE IF NOT EXISTS score_events (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    reason VARCHAR(40) NOT NULL CHECK (reason IN ('mission_completed', 'contribution_approved')),
    source_key VARCHAR(80) NOT NULL,
    points INTEGER NOT NULL CHECK (points > 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    revoked_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS ix_score_events_user_id ON score_events(user_id);
-- No máximo um evento ativo por origem; revogados permanecem no histórico,
-- e uma nova aprovação cria um novo evento em vez de reescrever o anterior.
CREATE UNIQUE INDEX IF NOT EXISTS score_events_active_once
    ON score_events(user_id, reason, source_key) WHERE revoked_at IS NULL;
CREATE INDEX IF NOT EXISTS ix_disposal_points_review_status ON disposal_points(review_status);
