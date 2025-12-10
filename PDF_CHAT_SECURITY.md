# 🔒 PDF Chat Security - API Key Authentication

## ✅ What Was Implemented

API key authentication has been added to secure communication between your Next.js app and the FastAPI backend.

### Security Flow:
```
Next.js API Routes → [X-API-Key Header] → FastAPI Middleware → Verify Key → Allow/Deny
```

---

## 🔑 API Key Setup

### 1. Generated Secure API Key
A 64-character hex key has been generated using `openssl rand -hex 32`:
```
ea75a5e56c5c11b2fb1abfa9bf5bcdb66a0e5df41aadabca466f29ef35a0e303
```

### 2. Added to Environment Files

**Next.js (`.env`)**:
```env
FASTAPI_URL="http://localhost:8000"
FASTAPI_API_KEY="ea75a5e56c5c11b2fb1abfa9bf5bcdb66a0e5df41aadabca466f29ef35a0e303"
```

**FastAPI (`pdf-chat/backend/.env`)**:
```env
API_SECRET_KEY=ea75a5e56c5c11b2fb1abfa9bf5bcdb66a0e5df41aadabca466f29ef35a0e303
```

---

## 🛡️ How It Works

### 1. Next.js API Routes
All API routes that call FastAPI now include the API key in headers:

```typescript
const response = await fetch(`${FASTAPI_URL}/process`, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "X-API-Key": FASTAPI_API_KEY || "",  // ✅ API key included
  },
  body: JSON.stringify(data),
});
```

**Updated routes**:
- ✅ `/api/pdf-chat/process/route.ts`
- ✅ `/api/pdf-chat/chat/route.ts`

### 2. FastAPI Middleware
Created `auth_middleware.py` that:
- Checks for `X-API-Key` header in all requests
- Validates against `API_SECRET_KEY` from environment
- Returns 401/403 if invalid
- Allows requests to proceed if valid

**Exempt endpoints** (no auth required):
- `/health` - Health check
- `/` - Root
- `/docs` - Swagger UI
- `/openapi.json` - OpenAPI spec
- `/redoc` - ReDoc

### 3. Middleware Integration
Added to `main.py`:
```python
from auth_middleware import APIKeyMiddleware

# API Key Authentication Middleware (FIRST - before CORS)
app.add_middleware(APIKeyMiddleware)
```

---

## 🧪 Testing

### Test Valid Request:
```bash
curl -X POST http://localhost:8000/process \
  -H "Content-Type: application/json" \
  -H "X-API-Key: ea75a5e56c5c11b2fb1abfa9bf5bcdb66a0e5df41aadabca466f29ef35a0e303" \
  -d '{"document_id": "test"}'
```
**Expected**: Request proceeds normally

### Test Missing API Key:
```bash
curl -X POST http://localhost:8000/process \
  -H "Content-Type: application/json" \
  -d '{"document_id": "test"}'
```
**Expected**: `401 Unauthorized - Missing API key`

### Test Invalid API Key:
```bash
curl -X POST http://localhost:8000/process \
  -H "Content-Type: application/json" \
  -H "X-API-Key: wrong-key" \
  -d '{"document_id": "test"}'
```
**Expected**: `403 Forbidden - Invalid API key`

### Test Health Check (No Auth):
```bash
curl http://localhost:8000/health
```
**Expected**: Works without API key

---

## 🔄 Key Rotation

To rotate the API key:

### 1. Generate New Key:
```bash
openssl rand -hex 32
```

### 2. Update Both `.env` Files:
```env
# Next.js .env
FASTAPI_API_KEY="new-key-here"

# FastAPI backend/.env
API_SECRET_KEY=new-key-here
```

### 3. Restart Both Services:
```bash
# Terminal 1 - FastAPI
cd pdf-chat/backend
uvicorn main:app --reload --port 8000

# Terminal 2 - Next.js
npm run dev
```

---

## 🚀 Production Deployment

### Environment Variables:
Make sure to set these in your production environment:

**Vercel/Next.js**:
```
FASTAPI_URL=https://your-fastapi-production-url.com
FASTAPI_API_KEY=your-production-api-key
```

**Railway/Render/AWS (FastAPI)**:
```
API_SECRET_KEY=your-production-api-key
```

### ⚠️ Important:
- **Never commit** API keys to git
- **Use different keys** for dev/staging/production
- **Rotate keys** regularly (every 90 days)
- **Monitor** for unauthorized access attempts

---

## 📊 Security Benefits

✅ **Prevents unauthorized access** - Only your Next.js app can call FastAPI  
✅ **No public exposure** - FastAPI endpoints require authentication  
✅ **Simple to implement** - Header-based authentication  
✅ **Easy to rotate** - Change key in 2 files  
✅ **Logging ready** - Can log failed auth attempts  

---

## 🔍 Monitoring

To monitor unauthorized access attempts, check FastAPI logs for:
- `401 Unauthorized` - Missing API key
- `403 Forbidden` - Invalid API key

Add logging to `auth_middleware.py` if needed:
```python
import logging

logger = logging.getLogger(__name__)

# In middleware:
if api_key != API_SECRET_KEY:
    logger.warning(f"Invalid API key attempt from {request.client.host}")
    # ...
```

---

## ✅ Security Checklist

- [x] API key generated (64-char hex)
- [x] Added to Next.js `.env`
- [x] Added to FastAPI `.env`
- [x] Middleware created (`auth_middleware.py`)
- [x] Middleware integrated in `main.py`
- [x] API routes updated to send key
- [x] Health check exempt from auth
- [x] Docs endpoints exempt from auth

---

## 🎉 Done!

Your FastAPI backend is now secured with API key authentication. Only your Next.js application can communicate with it.

**Test it**: Start both services and try uploading a PDF. It should work seamlessly with the API key being sent automatically in the background.
