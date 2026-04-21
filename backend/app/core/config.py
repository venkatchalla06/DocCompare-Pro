import os
from typing import List


class Settings:
    APP_NAME: str = "DocCompare Pro"
    VERSION: str = "1.0.0"

    REDIS_URL: str = os.getenv("REDIS_URL", "redis://localhost:6379/0")
    RESULT_TTL: int = int(os.getenv("RESULT_TTL", str(7 * 24 * 3600)))  # 7 days

    UPLOAD_DIR: str = os.getenv("UPLOAD_DIR", "/tmp/doccompare/uploads")
    RESULT_DIR: str = os.getenv("RESULT_DIR", "/tmp/doccompare/results")

    MAX_FILE_SIZE: int = 50 * 1024 * 1024  # 50 MB

    ALLOWED_ORIGINS: List[str] = os.getenv(
        "ALLOWED_ORIGINS", "http://localhost:5173,http://localhost:3000,http://localhost:8090"
    ).split(",")

    ALLOWED_MIME_TYPES: dict = {
        "application/pdf": [".pdf"],
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
        "application/msword": [".doc"],
        "text/plain": [".txt"],
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
        "text/html": [".html", ".htm"],
        "text/markdown": [".md"],
        "text/x-markdown": [".md"],
    }

    CHUNK_SIZE: int = 1000  # lines per chunk for large docs


settings = Settings()
