#!/usr/bin/env bash
set -e

# Install system dependencies
apt-get update -qq && apt-get install -y -qq \
    ghostscript tesseract-ocr tesseract-ocr-eng \
    libmagic1 poppler-utils 2>/dev/null || true

# Install Python dependencies
pip install -r backend/requirements.txt

# Create temp dirs
mkdir -p /tmp/doccompare/uploads /tmp/doccompare/results
