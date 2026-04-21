import os
import re
import magic
from fastapi import HTTPException, UploadFile
from app.core.config import settings


def sanitize_filename(name: str) -> str:
    name = os.path.basename(name)
    name = re.sub(r"[^\w.\-]", "_", name)
    return name[:255] if len(name) > 255 else name


def validate_upload(file: UploadFile, data: bytes) -> str:
    """Validate size, MIME type, and extension. Returns safe extension."""
    if len(data) > settings.MAX_FILE_SIZE:
        raise HTTPException(413, f"File '{file.filename}' exceeds 50 MB limit")

    detected = magic.from_buffer(data, mime=True)
    ext = os.path.splitext(file.filename or "")[1].lower()

    # Allow text/plain for .md files
    if ext in (".md",) and detected in ("text/plain", "text/x-markdown", "text/markdown"):
        return ext

    if detected not in settings.ALLOWED_MIME_TYPES:
        raise HTTPException(415, f"Unsupported file type: {detected}")

    allowed_exts = settings.ALLOWED_MIME_TYPES[detected]
    if ext not in allowed_exts:
        raise HTTPException(415, f"Extension '{ext}' does not match detected type '{detected}'")

    return ext
