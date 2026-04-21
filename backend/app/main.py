import os
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

from app.api.compare import router as compare_router
from app.api.result  import router as result_router
from app.core.config import settings

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

STATIC_DIR = os.path.join(os.path.dirname(__file__), "..", "static")


@asynccontextmanager
async def lifespan(app: FastAPI):
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    os.makedirs(settings.RESULT_DIR, exist_ok=True)
    logger.info("DocCompare Pro API started")
    yield
    logger.info("DocCompare Pro API shutting down")


app = FastAPI(
    title="DocCompare Pro API",
    version="1.0.0",
    description="Professional document comparison API",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(compare_router, prefix="/api")
app.include_router(result_router,  prefix="/api")


@app.get("/health")
async def health():
    return {"status": "ok", "version": "1.0.0"}


# Serve React SPA — must be LAST so API routes take priority
_static = os.path.abspath(STATIC_DIR)
if os.path.isdir(_static):
    app.mount("/assets", StaticFiles(directory=os.path.join(_static, "assets")), name="assets")

    @app.get("/{full_path:path}")
    async def spa_fallback(full_path: str):
        index = os.path.join(_static, "index.html")
        return FileResponse(index)
