"""
GET  /api/result/{id}           — full diff result
GET  /api/export/{id}/pdf       — download comparison PDF
GET  /api/export/{id}/docx      — download redline DOCX
GET  /api/export/{id}/csv       — download change report CSV
PUT  /api/result/{id}/notes     — save per-change notes & tags
GET  /api/result/{id}/notes     — load per-change notes & tags
"""
import json
import csv
import io
from fastapi import APIRouter, HTTPException
from fastapi.responses import Response, JSONResponse
from pydantic import BaseModel
from typing import Dict

from app.core.redis_client import get_redis
from app.core.config import settings
from app.services.exporter import export_pdf, export_docx

router = APIRouter(tags=["result"])


# ── helpers ──────────────────────────────────────────────────────────────────

async def _load(comparison_id: str) -> dict:
    redis = await get_redis()
    raw = await redis.get(f"comparison:{comparison_id}")
    if not raw:
        raise HTTPException(404, "Comparison not found or expired")
    return json.loads(raw)


async def _load_notes(comparison_id: str) -> dict:
    redis = await get_redis()
    raw = await redis.get(f"notes:{comparison_id}")
    return json.loads(raw) if raw else {}


# ── result ────────────────────────────────────────────────────────────────────

@router.get("/result/{comparison_id}", summary="Get full comparison result")
async def get_result(comparison_id: str):
    """
    Full diff result with annotated spans, summary, notes, and metadata.

    **Span types:** `equal` | `insert` | `delete` | `replace` | `move_from` | `move_to`
    """
    data = await _load(comparison_id)
    notes = await _load_notes(comparison_id)
    data["notes"] = notes
    return JSONResponse(data)


# ── notes & tags ──────────────────────────────────────────────────────────────

class NotesPayload(BaseModel):
    # keys are span indices as strings, values are {note, tag}
    notes: Dict[str, dict]


@router.put("/result/{comparison_id}/notes", summary="Save notes and tags")
async def save_notes(comparison_id: str, payload: NotesPayload):
    """
    Save per-change notes and tags.

    Body:
    ```json
    { "notes": { "42": { "note": "Needs review", "tag": "important" } } }
    ```
    Tags: `"important"` | `"approved"` | `"rejected"` | `"question"` | `""`
    """
    # Verify comparison exists
    await _load(comparison_id)
    redis = await get_redis()
    await redis.setex(
        f"notes:{comparison_id}",
        settings.RESULT_TTL,
        json.dumps(payload.notes),
    )
    return {"status": "saved"}


@router.get("/result/{comparison_id}/notes", summary="Load notes and tags")
async def get_notes(comparison_id: str):
    await _load(comparison_id)
    notes = await _load_notes(comparison_id)
    return JSONResponse(notes)


# ── exports ───────────────────────────────────────────────────────────────────

@router.get("/export/{comparison_id}/pdf", summary="Export comparison as PDF")
async def export_pdf_endpoint(comparison_id: str):
    data = await _load(comparison_id)
    pdf_bytes = export_pdf(data["original_spans"], data["revised_spans"], comparison_id)
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="doccompare_{comparison_id[:8]}.pdf"'},
    )


@router.get("/export/{comparison_id}/docx", summary="Export redline DOCX")
async def export_docx_endpoint(comparison_id: str):
    data = await _load(comparison_id)
    docx_bytes = export_docx(data["original_spans"], data["revised_spans"])
    return Response(
        content=docx_bytes,
        media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        headers={"Content-Disposition": f'attachment; filename="redline_{comparison_id[:8]}.docx"'},
    )


@router.get("/export/{comparison_id}/csv", summary="Export change report as CSV")
async def export_csv_endpoint(comparison_id: str):
    """
    Download a CSV change report with columns:
    Change #, Type, Side, Preview Text, Context, Note, Tag
    """
    data  = await _load(comparison_id)
    notes = await _load_notes(comparison_id)

    buf = io.StringIO()
    writer = csv.writer(buf)
    writer.writerow(["Change #", "Type", "Side", "Preview (80 chars)", "Context", "Note", "Tag"])

    change_num = 0
    orig_spans = data["original_spans"]
    rev_spans  = data["revised_spans"]

    CHANGE_TYPES = {"insert", "delete", "replace", "move_from", "move_to"}

    for idx, span in enumerate(orig_spans):
        if span["type"] in CHANGE_TYPES and span["text"].strip():
            change_num += 1
            note_data = notes.get(str(idx), {})
            writer.writerow([
                change_num,
                span["type"],
                "original",
                span["text"][:80].replace("\n", " "),
                span.get("context", "")[:80],
                note_data.get("note", ""),
                note_data.get("tag", ""),
            ])

    for idx, span in enumerate(rev_spans):
        if span["type"] in CHANGE_TYPES and span["text"].strip():
            change_num += 1
            note_data = notes.get(f"r{idx}", {})
            writer.writerow([
                change_num,
                span["type"],
                "revised",
                span["text"][:80].replace("\n", " "),
                span.get("context", "")[:80],
                note_data.get("note", ""),
                note_data.get("tag", ""),
            ])

    content = buf.getvalue().encode("utf-8-sig")  # utf-8-sig for Excel compatibility
    return Response(
        content=content,
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="changes_{comparison_id[:8]}.csv"'},
    )
