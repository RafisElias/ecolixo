import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.config import settings
from app.routers import auth, categories, disposal_points, gamification, notifications, pickup_services, reports

app = FastAPI(
    title="EcoLixo API",
    description="Plataforma de mapeamento de pontos de coleta de resíduos eletrônicos",
    version="1.0.0",
    docs_url="/docs" if settings.enable_docs else None,
    redoc_url="/redoc" if settings.enable_docs else None,
    openapi_url="/openapi.json" if settings.enable_docs else None,
)

if settings.cors_origin_list:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origin_list,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

os.makedirs(settings.upload_dir, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=settings.upload_dir), name="uploads")

app.include_router(auth.router)
app.include_router(disposal_points.router)
app.include_router(categories.router)
app.include_router(reports.router)
app.include_router(notifications.router)
app.include_router(pickup_services.router)
app.include_router(gamification.router)


@app.get("/health")
async def health():
    return {"status": "ok"}
