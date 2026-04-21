"""
POST /api/compare  — upload two files, extract, diff, store in Redis, return UUID
"""
import os
import uuid
import json
import asyncio
import tempfile
import aiofiles
from fastapi import APIRouter, UploadFile, File, HTTPException, BackgroundTasks
from fastapi.responses import JSONResponse

from app.core.config import settings
from app.core.security import sanitize_filename, validate_upload
from app.core.redis_client import get_redis
from app.services.extractor import extract_text
from app.services.differ import multi_granularity_compare

router = APIRouter(tags=["compare"])


async def _save_temp(data: bytes, suffix: str) -> str:
    fd, path = tempfile.mkstemp(suffix=suffix, dir=settings.UPLOAD_DIR)
    os.close(fd)
    async with aiofiles.open(path, "wb") as f:
        await f.write(data)
    return path


def _delete(path: str):
    try:
        os.unlink(path)
    except Exception:
        pass


@router.post("/compare", summary="Compare two documents")
async def compare_documents(
    background_tasks: BackgroundTasks,
    file_a: UploadFile = File(..., description="Original document"),
    file_b: UploadFile = File(..., description="Revised document"),
):
    """
    Upload two documents and get a comparison result.

    - **file_a**: The original document
    - **file_b**: The revised document
    - Supported formats: PDF, DOCX, DOC, TXT, XLSX, HTML, MD
    - Max size: 50 MB per file

    **Returns:**
    ```json
    {
      "id": "uuid",
      "status": "completed",
      "summary": {"additions": 3, "deletions": 1, "modifications": 2, "total": 6},
      "url": "/compare/uuid"
    }
    ```
    """
    data_a = await file_a.read()
    data_b = await file_b.read()

    ext_a = validate_upload(file_a, data_a)
    ext_b = validate_upload(file_b, data_b)

    path_a = await _save_temp(data_a, ext_a)
    path_b = await _save_temp(data_b, ext_b)

    try:
        loop = asyncio.get_event_loop()
        text_a = await loop.run_in_executor(None, extract_text, path_a, ext_a)
        text_b = await loop.run_in_executor(None, extract_text, path_b, ext_b)
    finally:
        # Delete source files immediately after extraction
        background_tasks.add_task(_delete, path_a)
        background_tasks.add_task(_delete, path_b)

    diff = await asyncio.get_event_loop().run_in_executor(
        None, multi_granularity_compare, text_a, text_b
    )

    comparison_id = str(uuid.uuid4())
    payload = {
        "id": comparison_id,
        "status": "completed",
        "file_a_name": sanitize_filename(file_a.filename or "original"),
        "file_b_name": sanitize_filename(file_b.filename or "revised"),
        "original_spans": diff["original_spans"],
        "revised_spans":  diff["revised_spans"],
        "summary": diff["summary"],
        "url": f"/compare/{comparison_id}",
    }

    redis = await get_redis()
    await redis.setex(
        f"comparison:{comparison_id}",
        settings.RESULT_TTL,
        json.dumps(payload),
    )

    return JSONResponse({
        "id": comparison_id,
        "status": "completed",
        "summary": diff["summary"],
        "url": f"/compare/{comparison_id}",
    })
