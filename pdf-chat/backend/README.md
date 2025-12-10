# PDF Chat RAG Backend

FastAPI backend for PDF chat with RAG capabilities.

## Setup

1. Create virtual environment:
```bash
python -m venv venv
```

2. Activate virtual environment:
```bash
# Windows
.\venv\Scripts\activate

# Linux/Mac
source venv/bin/activate
```

3. Install dependencies:
```bash
pip install -r requirements.txt
```

4. Run the server:
```bash
uvicorn main:app --reload --port 8000
```

## API Endpoints

- `GET /health` - Health check
- `POST /api/pdf-chat/upload` - Upload PDF
- `POST /api/pdf-chat/chat` - Chat with PDF
- `GET /api/pdf-chat/documents` - List documents
- `DELETE /api/pdf-chat/documents/{id}` - Delete document

## Environment Variables

Create a `.env` file in the backend directory:

```env
OPENAI_API_KEY=your_key_here
VECTOR_STORE_PATH=./data/vector_store
UPLOAD_DIR=./data/uploads
```
