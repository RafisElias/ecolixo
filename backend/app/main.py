from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os

from app.config import settings
from app.routers import auth, disposal_points, categories, reports, notifications

app = FastAPI(
    title="EcoLixo API",
    description="Plataforma de mapeamento de pontos de coleta de resíduos eletrônicos",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
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


@app.get("/health")
async def health():
    return {"status": "ok"}
