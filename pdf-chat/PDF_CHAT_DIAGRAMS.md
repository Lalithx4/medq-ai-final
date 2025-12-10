# PDF Chat - Visual Architecture Diagrams

## System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                          USER BROWSER                                │
│  ┌────────────────┐  ┌────────────────┐  ┌────────────────┐        │
│  │  PDFUploader   │  │   PDFViewer    │  │ ChatInterface  │        │
│  │   Component    │  │   Component    │  │   Component    │        │
│  └────────┬───────┘  └────────┬───────┘  └────────┬───────┘        │
└───────────┼──────────────────┼──────────────────┼──────────────────┘
            │                   │                   │
            │ Upload PDF        │ Display PDF       │ Send Message
            │                   │                   │
┌───────────▼───────────────────▼───────────────────▼──────────────────┐
│                    NEXT.JS APPLICATION (Port 3000)                    │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │                    API ROUTES LAYER                           │   │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐    │   │
│  │  │  upload  │  │ process  │  │   chat   │  │ sessions │    │   │
│  │  │ route.ts │  │ route.ts │  │ route.ts │  │ route.ts │    │   │
│  │  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘    │   │
│  └───────┼─────────────┼─────────────┼─────────────┼───────────┘   │
│          │             │             │             │                 │
│          │ Save File   │ Forward     │ Forward     │ Query DB       │
│          │             │             │             │                 │
└──────────┼─────────────┼─────────────┼─────────────┼─────────────────┘
           │             │             │             │
           ▼             │             │             │
    ┌─────────────┐     │             │             │
    │   LOCAL     │     │             │             │
    │   STORAGE   │     │             │             │
    │ data/uploads│     │             │             │
    └─────────────┘     │             │             │
                        │             │             │
                        ▼             ▼             │
           ┌────────────────────────────────────┐  │
           │   FASTAPI BACKEND (Port 8000)     │  │
           │                                    │  │
           │  ┌──────────────────────────────┐ │  │
           │  │  MedicalDocumentChat Class   │ │  │
           │  │                              │ │  │
           │  │  • process_uploaded_file()   │ │  │
           │  │  • hybrid_search()           │ │  │
           │  │  • generate_answer()         │ │  │
           │  └──────────────────────────────┘ │  │
           │                                    │  │
           │  ┌──────────────────────────────┐ │  │
           │  │      ML MODELS               │ │  │
           │  │  • PubMedBERT (Embeddings)   │ │  │
           │  │  • spaCy (Entity Extraction) │ │  │
           │  │  • Cerebras LLM (via API)    │ │  │
           │  └──────────────────────────────┘ │  │
           └────────────┬───────────────────────┘  │
                        │                           │
                        │ Store/Query               │
                        ▼                           ▼
┌────────────────────────────────────────────────────────────────────┐
│                   SUPABASE DATABASE (PostgreSQL)                    │
│                                                                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐            │
│  │pdf_documents │  │chat_sessions │  │chat_messages │            │
│  │              │  │              │  │              │            │
│  │ • id         │  │ • id         │  │ • id         │            │
│  │ • filename   │  │ • doc_id     │  │ • session_id │            │
│  │ • status     │  │ • title      │  │ • role       │            │
│  │ • user_id    │  │ • user_id    │  │ • content    │            │
│  └──────────────┘  └──────────────┘  │ • sources    │            │
│                                       └──────────────┘            │
│  ┌──────────────┐  ┌──────────────┐                              │
│  │medical_chunks│  │medical_entities                             │
│  │              │  │              │                              │
│  │ • id         │  │ • id         │                              │
│  │ • doc_id     │  │ • doc_id     │                              │
│  │ • chunk_text │  │ • entity_name│                              │
│  │ • page_num   │  │ • entity_type│                              │
│  │ • embedding  │  │ • confidence │                              │
│  │   vector(768)│  └──────────────┘                              │
│  └──────────────┘                                                 │
│                                                                     │
│  INDEXES:                                                          │
│  • IVFFlat vector index (similarity search)                       │
│  • GIN trigram index (text search)                                │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Document Upload Flow

```
┌─────────┐
│  USER   │
└────┬────┘
     │ 1. Selects PDF file
     ▼
┌─────────────────┐
│  PDFUploader    │
│   Component     │
└────┬────────────┘
     │ 2. POST /api/pdf-chat/upload (FormData)
     ▼
┌─────────────────────────────────────────┐
│  Next.js API: /api/pdf-chat/upload      │
│                                          │
│  ✓ Authenticate user                    │
│  ✓ Validate file (PDF, <100MB)          │
│  ✓ Save to: data/uploads/{uuid}.pdf     │
│  ✓ Insert into pdf_documents            │
│     - status: 'uploading'               │
│  ✓ Return documentId                    │
└────┬────────────────────────────────────┘
     │ 3. { documentId: "abc-123" }
     ▼
┌─────────────────┐
│  PDFUploader    │
│   Component     │
└────┬────────────┘
     │ 4. POST /api/pdf-chat/process
     ▼
┌─────────────────────────────────────────┐
│  Next.js API: /api/pdf-chat/process     │
│                                          │
│  ✓ Update status: 'processing'          │
│  ✓ Forward to FastAPI                   │
└────┬────────────────────────────────────┘
     │ 5. POST http://localhost:8000/api/pdf-chat/process
     ▼
┌─────────────────────────────────────────────────────────────┐
│  FastAPI: MedicalDocumentChat.process_uploaded_file()       │
│                                                              │
│  STEP 1: Extract Text                                       │
│  ┌────────────────────────────────────────────────────┐    │
│  │ Try PyMuPDF → PyPDF2 → OCR                         │    │
│  │ Output: [{ text, page, source }]                   │    │
│  └────────────────────────────────────────────────────┘    │
│                                                              │
│  STEP 2: Chunk Text                                         │
│  ┌────────────────────────────────────────────────────┐    │
│  │ RecursiveCharacterTextSplitter                     │    │
│  │ - chunk_size: 1500 chars                           │    │
│  │ - chunk_overlap: 300 chars                         │    │
│  │ Output: 45 chunks                                  │    │
│  └────────────────────────────────────────────────────┘    │
│                                                              │
│  STEP 3: Generate Embeddings                                │
│  ┌────────────────────────────────────────────────────┐    │
│  │ PubMedBERT.encode(chunk)                           │    │
│  │ Output: vector(768) per chunk                      │    │
│  └────────────────────────────────────────────────────┘    │
│                                                              │
│  STEP 4: Extract Entities                                   │
│  ┌────────────────────────────────────────────────────┐    │
│  │ spaCy NER (en_core_sci_md)                         │    │
│  │ Extract: DISEASE, DRUG, SYMPTOM, etc.              │    │
│  │ Output: 120 entities                               │    │
│  └────────────────────────────────────────────────────┘    │
│                                                              │
│  STEP 5: Store in Database                                  │
│  ┌────────────────────────────────────────────────────┐    │
│  │ INSERT INTO medical_chunks                         │    │
│  │   (doc_id, chunk_text, embedding, page_num)        │    │
│  │ INSERT INTO medical_entities                       │    │
│  │   (doc_id, entity_name, entity_type)               │    │
│  └────────────────────────────────────────────────────┘    │
└────┬────────────────────────────────────────────────────────┘
     │ 6. { success: true, num_chunks: 45 }
     ▼
┌─────────────────────────────────────────┐
│  Next.js API: /api/pdf-chat/process     │
│                                          │
│  ✓ Update pdf_documents                 │
│     - status: 'ready'                   │
│     - page_count: 45                    │
└────┬────────────────────────────────────┘
     │ 7. Redirect to /pdf-chat/{documentId}
     ▼
┌─────────────────┐
│  Chat Page      │
│  Ready to use!  │
└─────────────────┘
```

---

## Chat Query Flow

```
┌─────────┐
│  USER   │
└────┬────┘
     │ 1. Types question: "What are the side effects?"
     ▼
┌─────────────────┐
│ ChatInterface   │
│   Component     │
└────┬────────────┘
     │ 2. POST /api/pdf-chat/chat
     │    { sessionId, message }
     ▼
┌─────────────────────────────────────────┐
│  Next.js API: /api/pdf-chat/chat        │
│                                          │
│  ✓ Authenticate user                    │
│  ✓ Verify session ownership             │
│  ✓ Save user message to DB              │
│  ✓ Forward to FastAPI                   │
└────┬────────────────────────────────────┘
     │ 3. POST http://localhost:8000/api/pdf-chat/chat
     │    { query, document_id, k: 5 }
     ▼
┌─────────────────────────────────────────────────────────────┐
│  FastAPI: MedicalDocumentChat.hybrid_search()               │
│                                                              │
│  STEP 1: Generate Query Embedding                           │
│  ┌────────────────────────────────────────────────────┐    │
│  │ query_embedding = PubMedBERT.encode(query)         │    │
│  │ Output: vector(768)                                │    │
│  └────────────────────────────────────────────────────┘    │
│                                                              │
│  STEP 2: Semantic Search (Vector Similarity)                │
│  ┌────────────────────────────────────────────────────┐    │
│  │ SELECT *, 1 - (embedding <=> query_embedding)      │    │
│  │ FROM medical_chunks                                │    │
│  │ WHERE document_id = $1                             │    │
│  │ ORDER BY embedding <=> query_embedding             │    │
│  │ LIMIT 10                                           │    │
│  │                                                     │    │
│  │ Results: 10 chunks with similarity scores          │    │
│  └────────────────────────────────────────────────────┘    │
│                                                              │
│  STEP 3: Keyword Search (Text Matching)                     │
│  ┌────────────────────────────────────────────────────┐    │
│  │ SELECT *, similarity(chunk_text, query)            │    │
│  │ FROM medical_chunks                                │    │
│  │ WHERE chunk_text % query                           │    │
│  │ ORDER BY similarity DESC                           │    │
│  │ LIMIT 10                                           │    │
│  │                                                     │    │
│  │ Results: 10 chunks with keyword scores             │    │
│  └────────────────────────────────────────────────────┘    │
│                                                              │
│  STEP 4: Combine Results (Hybrid)                           │
│  ┌────────────────────────────────────────────────────┐    │
│  │ final_score = 0.7 × semantic + 0.3 × keyword       │    │
│  │ Sort by final_score                                │    │
│  │ Return top 5 chunks                                │    │
│  └────────────────────────────────────────────────────┘    │
└────┬────────────────────────────────────────────────────────┘
     │ 4. Top 5 chunks with scores
     ▼
┌─────────────────────────────────────────────────────────────┐
│  FastAPI: MedicalDocumentChat.generate_answer()             │
│                                                              │
│  STEP 1: Build Context                                      │
│  ┌────────────────────────────────────────────────────┐    │
│  │ context = """                                       │    │
│  │ [1] {chunk_1_text}                                 │    │
│  │ [2] {chunk_2_text}                                 │    │
│  │ [3] {chunk_3_text}                                 │    │
│  │ [4] {chunk_4_text}                                 │    │
│  │ [5] {chunk_5_text}                                 │    │
│  │ """                                                │    │
│  └────────────────────────────────────────────────────┘    │
│                                                              │
│  STEP 2: Call Cerebras LLM                                  │
│  ┌────────────────────────────────────────────────────┐    │
│  │ POST https://api.cerebras.ai/v1/chat/completions   │    │
│  │ {                                                  │    │
│  │   model: "llama-3.3-70b",                          │    │
│  │   messages: [                                      │    │
│  │     { role: "system", content: "You are..." },     │    │
│  │     { role: "user", content: prompt }              │    │
│  │   ],                                               │    │
│  │   temperature: 0.1                                 │    │
│  │ }                                                  │    │
│  │                                                     │    │
│  │ Response: "The side effects include... [1][3]"     │    │
│  └────────────────────────────────────────────────────┘    │
│                                                              │
│  STEP 3: Extract Citations                                  │
│  ┌────────────────────────────────────────────────────┐    │
│  │ Parse [1], [2] markers                             │    │
│  │ Map to page numbers from chunks                    │    │
│  │ Calculate confidence scores                        │    │
│  │                                                     │    │
│  │ Citations: [                                       │    │
│  │   { page: 5, similarity: 0.87, excerpt: "..." },   │    │
│  │   { page: 7, similarity: 0.82, excerpt: "..." }    │    │
│  │ ]                                                  │    │
│  └────────────────────────────────────────────────────┘    │
└────┬────────────────────────────────────────────────────────┘
     │ 5. { answer, citations, confidence }
     ▼
┌─────────────────────────────────────────┐
│  Next.js API: /api/pdf-chat/chat        │
│                                          │
│  ✓ Save assistant message               │
│     - content: answer                   │
│     - sources: citations (JSONB)        │
└────┬────────────────────────────────────┘
     │ 6. Return to frontend
     ▼
┌─────────────────┐
│ ChatInterface   │
│   Component     │
│                 │
│ Displays:       │
│ • Answer text   │
│ • Citations     │
│ • Page refs     │
└─────────────────┘
```

---

## Database Relationships

```
┌──────────────────┐
│  pdf_documents   │
│  ────────────    │
│  • id (PK)       │
│  • user_id       │
│  • filename      │
│  • status        │
└────┬─────────────┘
     │
     │ 1:N
     │
     ├─────────────────────────┬─────────────────────┐
     │                         │                     │
     ▼                         ▼                     ▼
┌──────────────┐    ┌──────────────────┐    ┌──────────────┐
│chat_sessions │    │ medical_chunks   │    │medical_entities
│──────────────│    │ ──────────────── │    │──────────────│
│• id (PK)     │    │ • id (PK)        │    │• id (PK)     │
│• doc_id (FK) │    │ • doc_id (FK)    │    │• doc_id (FK) │
│• user_id     │    │ • chunk_text     │    │• entity_name │
│• title       │    │ • page_number    │    │• entity_type │
└────┬─────────┘    │ • embedding      │    │• confidence  │
     │              │   vector(768)    │    └──────────────┘
     │ 1:N          └──────────────────┘
     │
     ▼
┌──────────────┐
│chat_messages │
│──────────────│
│• id (PK)     │
│• session_id  │
│  (FK)        │
│• role        │
│• content     │
│• sources     │
│  (JSONB)     │
└──────────────┘
```

---

## Hybrid Search Algorithm

```
Query: "What are the side effects of aspirin?"

┌─────────────────────────────────────────┐
│  STEP 1: Generate Query Embedding       │
│  ────────────────────────────────────   │
│  Input: "What are the side effects..."  │
│  Model: PubMedBERT                      │
│  Output: [0.23, -0.45, 0.67, ...]       │
│          (768 dimensions)               │
└────┬────────────────────────────────────┘
     │
     ├──────────────────┬─────────────────┐
     │                  │                 │
     ▼                  ▼                 │
┌─────────────┐  ┌─────────────┐        │
│  SEMANTIC   │  │  KEYWORD    │        │
│   SEARCH    │  │   SEARCH    │        │
│─────────────│  │─────────────│        │
│             │  │             │        │
│ Vector      │  │ Trigram     │        │
│ Similarity  │  │ Matching    │        │
│             │  │             │        │
│ Cosine      │  │ pg_trgm     │        │
│ Distance    │  │ similarity  │        │
│             │  │             │        │
│ Results:    │  │ Results:    │        │
│ ┌─────────┐ │  │ ┌─────────┐ │        │
│ │Chunk A  │ │  │ │Chunk B  │ │        │
│ │Score:0.9│ │  │ │Score:0.7│ │        │
│ └─────────┘ │  │ └─────────┘ │        │
│ ┌─────────┐ │  │ ┌─────────┐ │        │
│ │Chunk C  │ │  │ │Chunk A  │ │        │
│ │Score:0.8│ │  │ │Score:0.6│ │        │
│ └─────────┘ │  │ └─────────┘ │        │
└─────┬───────┘  └─────┬───────┘        │
      │                │                 │
      └────────┬───────┘                 │
               ▼                         │
     ┌─────────────────┐                 │
     │  COMBINE        │                 │
     │  ─────────      │                 │
     │  Formula:       │                 │
     │  final_score =  │                 │
     │  0.7 × semantic │                 │
     │  + 0.3 × keyword│                 │
     │                 │                 │
     │  Chunk A:       │                 │
     │  0.7×0.9 +      │                 │
     │  0.3×0.6 = 0.81 │                 │
     │                 │                 │
     │  Chunk C:       │                 │
     │  0.7×0.8 +      │                 │
     │  0.3×0.0 = 0.56 │                 │
     │                 │                 │
     │  Chunk B:       │                 │
     │  0.7×0.0 +      │                 │
     │  0.3×0.7 = 0.21 │                 │
     └────┬────────────┘                 │
          │                              │
          ▼                              │
     ┌─────────────────┐                 │
     │  RANK & FILTER  │                 │
     │  ──────────────  │                 │
     │  1. Chunk A     │                 │
     │     Score: 0.81 │                 │
     │  2. Chunk C     │                 │
     │     Score: 0.56 │                 │
     │  3. Chunk B     │                 │
     │     Score: 0.21 │                 │
     │                 │                 │
     │  Return top 5   │                 │
     └─────────────────┘                 │
                                         │
                                         ▼
                              ┌─────────────────┐
                              │  SEND TO LLM    │
                              │  ───────────    │
                              │  Context built  │
                              │  from top chunks│
                              └─────────────────┘
```

---

## Storage Architecture

```
┌────────────────────────────────────────────────────────┐
│                    FILE STORAGE                         │
└────────────────────────────────────────────────────────┘

LOCAL DISK (Server)                    SUPABASE DATABASE
─────────────────────                  ──────────────────

data/uploads/                          pdf_documents table
├── user1_1234567.pdf                  ├── id: abc-123
├── user1_1234568.pdf                  │   filename: "report.pdf"
├── user2_1234569.pdf                  │   status: "ready"
└── user2_1234570.pdf                  │   file_url: null
                                       │   local_path: "data/uploads/..."
    ↓ Process                          │
                                       medical_chunks table
    Extract Text                       ├── chunk_text: "The patient..."
    ↓                                  │   page_number: 5
                                       │   embedding: [0.23, -0.45, ...]
    Generate Embeddings                │   (768 dimensions)
    ↓                                  │
                                       medical_entities table
    Store in DB                        ├── entity_name: "Aspirin"
    ↓                                  │   entity_type: "DRUG"
                                       │   confidence: 0.85

┌────────────────────────────────────────────────────────┐
│  WHY THIS APPROACH?                                    │
│  ────────────────────                                  │
│  ✓ PDFs stay local = faster processing                │
│  ✓ Embeddings in Supabase = fast vector search        │
│  ✓ No storage costs for large PDFs                    │
│  ✓ Easy to migrate to cloud storage later             │
│  ✓ Supabase optimized for vector operations           │
└────────────────────────────────────────────────────────┘
```

---

## Entity Extraction Pipeline

```
Input Text: "The patient was prescribed Aspirin 100mg for hypertension."

┌─────────────────────────────────────────┐
│  spaCy NER (en_core_sci_md)             │
│  ─────────────────────────              │
│  Medical NLP Model                      │
└────┬────────────────────────────────────┘
     │
     ▼
┌─────────────────────────────────────────┐
│  Detected Entities:                     │
│  ──────────────────                     │
│                                         │
│  1. "Aspirin"                           │
│     Type: DRUG                          │
│     Confidence: 0.92                    │
│     Position: 27-34                     │
│                                         │
│  2. "100mg"                             │
│     Type: DOSAGE                        │
│     Confidence: 0.88                    │
│     Position: 35-40                     │
│                                         │
│  3. "hypertension"                      │
│     Type: DISEASE                       │
│     Confidence: 0.95                    │
│     Position: 45-57                     │
└────┬────────────────────────────────────┘
     │
     ▼
┌─────────────────────────────────────────┐
│  Store in medical_entities table        │
│  ────────────────────────────────       │
│  INSERT INTO medical_entities           │
│  (document_id, entity_name,             │
│   entity_type, confidence_score)        │
│  VALUES                                 │
│  ('doc-123', 'Aspirin', 'DRUG', 0.92),  │
│  ('doc-123', '100mg', 'DOSAGE', 0.88),  │
│  ('doc-123', 'hypertension',            │
│   'DISEASE', 0.95)                      │
└────┬────────────────────────────────────┘
     │
     ▼
┌─────────────────────────────────────────┐
│  Knowledge Graph (Optional)             │
│  ──────────────────────────             │
│  Aspirin ──[TREATS]──> Hypertension     │
│  Aspirin ──[DOSAGE]──> 100mg            │
└─────────────────────────────────────────┘
```

This visual documentation provides clear diagrams of how your PDF Chat system works!
