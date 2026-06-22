import os
import uuid
import shutil
from fastapi import UploadFile, HTTPException, status
from app.config import settings

ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp"}


def validate_and_save_photo(photo: UploadFile | None) -> str | None:
    """Valida extensão, tamanho e salva o arquivo. Retorna URL relativa ou None."""
    if not photo or not photo.filename:
        return None

    if photo.size and photo.size > settings.max_upload_mb * 1024 * 1024:
        raise HTTPException(status_code=413, detail="Photo too large")

    ext = os.path.splitext(photo.filename or "")[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=415, detail="Unsupported image format")

    filename = f"{uuid.uuid4()}{ext}"
    dest = os.path.join(settings.upload_dir, filename)
    with open(dest, "wb") as f:
        shutil.copyfileobj(photo.file, f)

    return f"/uploads/{filename}"
