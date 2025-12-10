# pdf-chat/backend/Dockerfile
# Stable Python for spaCy/scispaCy wheels
FROM python:3.11-slim

# System deps for PDF parsing / OCR (minimal set)
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    curl wget git \
    libglib2.0-0 libgl1 \
    tesseract-ocr poppler-utils \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Python deps
COPY requirements.txt ./
RUN pip install --upgrade pip setuptools wheel \
 && pip install -r requirements.txt \
 && pip install "en_core_sci_md @ https://s3-us-west-2.amazonaws.com/ai2-s2-scispacy/releases/v0.5.3/en_core_sci_md-0.5.3.tar.gz"

# App code
COPY . .

# Railway will pass $PORT
ENV PORT=8000
EXPOSE 8000

# Start server
CMD ["sh", "-c", "uvicorn main:app --host 0.0.0.0 --port ${PORT}"]
