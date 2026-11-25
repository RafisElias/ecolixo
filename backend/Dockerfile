FROM python:3.12-slim

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq-dev gcc && rm -rf /var/lib/apt/lists/*

COPY requirements.txt requirements-dev.txt ./
# INSTALL_DEV=true (Compose de desenvolvimento) inclui ferramentas como o ruff.
ARG INSTALL_DEV=false
RUN pip install --no-cache-dir -r $([ "$INSTALL_DEV" = "true" ] && echo requirements-dev.txt || echo requirements.txt)

COPY . .

# Usuário sem privilégios; o volume de uploads novo herda a posse deste diretório.
RUN useradd --system --uid 10001 --home /app app && mkdir -p /app/uploads && chown app /app/uploads
USER app

EXPOSE 8000
CMD ["sh", "-c", "alembic upgrade head && exec uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 2 --proxy-headers --forwarded-allow-ips '*'"]
