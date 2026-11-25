import os
import uuid

from fastapi import HTTPException, UploadFile

from app.config import settings

ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp"}
CHUNK_SIZE = 64 * 1024


def detect_image_extension(header: bytes) -> str | None:
    """Identifica o formato pela assinatura do arquivo, não pelo nome enviado."""
    if header.startswith(b"\xff\xd8\xff"):
        return ".jpg"
    if header.startswith(b"\x89PNG\r\n\x1a\n"):
        return ".png"
    if header[:4] == b"RIFF" and header[8:12] == b"WEBP":
        return ".webp"
    return None


def _read_limited(photo: UploadFile, max_bytes: int) -> bytes:
    data = bytearray()
    while chunk := photo.file.read(CHUNK_SIZE):
        data.extend(chunk)
        if len(data) > max_bytes:
            raise HTTPException(status_code=413, detail="A foto excede o tamanho máximo permitido")
    return bytes(data)


def validate_photo(photo: UploadFile | None) -> tuple[bytes, str] | None:
    """Valida extensão, tamanho real e assinatura da imagem. Não grava nada."""
    if not photo or not photo.filename:
        return None

    ext = os.path.splitext(photo.filename)[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=415, detail="Formato de imagem não suportado")

    content = _read_limited(photo, settings.max_upload_mb * 1024 * 1024)
    detected = detect_image_extension(content[:12])
    if detected is None:
        raise HTTPException(status_code=415, detail="O arquivo enviado não é uma imagem válida")
    return content, detected


def save_photo(validated: tuple[bytes, str] | None) -> str | None:
    """Grava uma foto já validada e retorna a URL relativa."""
    if validated is None:
        return None
    content, ext = validated
    filename = f"{uuid.uuid4()}{ext}"
    with open(os.path.join(settings.upload_dir, filename), "wb") as f:
        f.write(content)
    return f"/uploads/{filename}"
