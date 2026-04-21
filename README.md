# DocCompare Pro

A professional document comparison tool modelled after Draftable.
Compare PDF, DOCX, DOC, TXT, XLSX, HTML, and Markdown files with a split-screen diff viewer.

## Features
- Drag-and-drop upload for two documents (Original + Revised)
- Text extraction: pdfplumber (PDF), python-docx (DOCX), openpyxl (XLSX), markdown, html.parser
- difflib-based word-level comparison with insertion / deletion / modification tagging
- Split-screen viewer with synchronized scrolling and change navigation
- Change Summary Panel with filter by type and clickable jump-to
- Export as PDF (highlighted) or DOCX (redline tracked-changes)
- Shareable UUID link, auto-expires after 7 days (Redis TTL)
- REST API: `POST /api/compare`, `GET /api/result/{id}`, `GET /api/export/{id}/pdf|docx`

## Quick Start (Docker)

```bash
cd DocCompare-Pro
docker compose up --build
```

App: **http://localhost:8090**  
API Docs: **http://localhost:8090/api/docs**

## Local Development

### Backend
```bash
cd backend
pip install -r requirements.txt
# start Redis locally first
uvicorn app.main:app --reload --port 8000
```

### Frontend
```bash
cd frontend
npm install
npm run dev   # http://localhost:5173
```

## Running Tests
```bash
cd backend
pip install pytest pytest-asyncio
pytest app/tests/ -v
```

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `REDIS_URL` | `redis://redis:6379/0` | Redis connection string |
| `UPLOAD_DIR` | `/tmp/doccompare/uploads` | Temp upload directory |
| `RESULT_DIR` | `/tmp/doccompare/results` | Result cache directory |
| `RESULT_TTL` | `604800` | Redis TTL in seconds (7 days) |
| `ALLOWED_ORIGINS` | `http://localhost:8090` | CORS allowed origins (comma-separated) |

## API Reference

### POST /api/compare
Upload two files for comparison.

**Request:** `multipart/form-data`
- `file_a` — Original document
- `file_b` — Revised document

**Response:**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "status": "completed",
  "summary": {
    "additions": 3,
    "deletions": 1,
    "modifications": 2,
    "total": 6
  },
  "url": "/compare/550e8400-e29b-41d4-a716-446655440000"
}
```

### GET /api/result/{id}
Retrieve full diff result with annotated spans.

**Response:**
```json
{
  "id": "550e8400...",
  "status": "completed",
  "file_a_name": "contract_v1.pdf",
  "file_b_name": "contract_v2.pdf",
  "original_spans": [
    { "type": "equal",  "text": "This Agreement", "offset": 0,  "length": 14, "context": "" },
    { "type": "delete", "text": " is made",       "offset": 14, "length": 8,  "context": "This Agreement is made on" }
  ],
  "revised_spans": [
    { "type": "equal",  "text": "This Agreement", "offset": 0,  "length": 14, "context": "" },
    { "type": "insert", "text": " was executed",  "offset": 14, "length": 13, "context": "This Agreement was executed on" }
  ],
  "summary": { "additions": 1, "deletions": 1, "modifications": 0, "total": 2 },
  "url": "/compare/550e8400..."
}
```

### GET /api/export/{id}/pdf
Download comparison as highlighted PDF.

### GET /api/export/{id}/docx
Download redline DOCX with tracked-changes markup.
