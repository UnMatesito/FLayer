import uuid
from pathlib import Path

from fastapi import UploadFile

UPLOAD_DIR = Path("uploads")
ALLOWED_CONTENT_TYPES = {"image/jpeg", "image/png", "image/webp"}
MAX_FILE_SIZE = 10 * 1024 * 1024


def validate_image(file: UploadFile) -> None:
    if file.content_type not in ALLOWED_CONTENT_TYPES:
        raise ValueError(
            f"Invalid file type '{file.content_type}'. "
            f"Allowed: {', '.join(sorted(ALLOWED_CONTENT_TYPES))}"
        )
    file.file.seek(0, 2)
    size = file.file.tell()
    file.file.seek(0)
    if size > MAX_FILE_SIZE:
        raise ValueError(f"File too large. Maximum size is {MAX_FILE_SIZE // (1024*1024)}MB")


async def save_file(file: UploadFile, product_id: uuid.UUID) -> str:
    validate_image(file)
    ext = _ext_from_content_type(file.content_type)
    filename = f"{product_id}{ext}"
    upload_path = UPLOAD_DIR / filename
    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    content = await file.read()
    upload_path.write_bytes(content)
    return str(upload_path)


def get_file_url(path: str) -> str:
    return f"/{path}"


def _ext_from_content_type(content_type: str | None) -> str:
    mapping = {
        "image/jpeg": ".jpg",
        "image/png": ".png",
        "image/webp": ".webp",
    }
    return mapping.get(content_type or "", ".bin")
