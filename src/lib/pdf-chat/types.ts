/**
 * PDF Chat RAG System - TypeScript Types
 */

export type DocumentStatus = 'uploading' | 'processing' | 'ready' | 'error';

export interface PDFDocument {
  id: string;
  userId: string;
  collectionId?: string;
  filename: string;
  originalName: string;
  fileUrl?: string;
  fileSize: number;
  pageCount?: number;
  status: DocumentStatus;
  processingError?: string;
  metadata?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface MedicalChunk {
  id: string;
  document_id: string;
  chunk_idx: number;
  chunk_text: string;
  page_number?: number;
  chunk_type: string;
  token_count?: number;
  embedding?: number[];
  metadata?: Record<string, any>;
  created_at: string;
}

export interface MedicalEntity {
  id: string;
  document_id: string;
  entity_name: string;
  entity_type: string;
  entity_text?: string;
  start_char?: number;
  end_char?: number;
  confidence_score?: number;
  metadata?: Record<string, any>;
  created_at: string;
}

export interface ChatSession {
  id: string;
  documentId: string;
  userId: string;
  title: string;
  createdAt: string;
  updatedAt: string;
}

export interface ChatMessage {
  id: string;
  sessionId: string;
  role: 'user' | 'assistant';
  content: string;
  sources?: CitationSource[];
  confidenceScore?: number;
  createdAt: string;
  // Optional metadata for PDF intelligence actions (summary/slides/word)
  downloadUrl?: string;
  action?: 'pdf_summary' | 'slides' | 'pdf_summary_docx';
}

export interface CitationSource {
  pageNumber: number;
  similarity: number;
  textExcerpt: string;
  chunkId?: string;
}

// API Request/Response Types

export interface UploadResponse {
  documentId: string;
  filename: string;
  status: DocumentStatus;
}

export interface ProcessRequest {
  documentId: string;
}

export interface ProcessResponse {
  success: boolean;
  documentId: string;
  status: DocumentStatus;
  message?: string;
  error?: string;
}

export interface ChatRequest {
  sessionId: string;
  message: string;
}

export interface ChatResponse {
  messageId: string;
  content: string;
  sources?: CitationSource[];
  confidence?: number;
}

export interface CreateSessionRequest {
  documentId: string;
  title?: string;
}

export interface CreateSessionResponse {
  sessionId: string;
  title: string;
}

// FastAPI Backend Types

export interface FastAPIProcessRequest {
  document_id: string;
  file_path: string;
  filename: string;
  user_id: string;
}

export interface FastAPIProcessResponse {
  success: boolean;
  document_id: string;
  chunks_created: number;
  entities_extracted: number;
  processing_time: number;
  error?: string;
}

export interface FastAPIChatRequest {
  document_id: string;
  query: string;
  user_id?: string;
  session_id?: string;
  top_k?: number;
}

export interface FastAPIChatResponse {
  answer: string;
  sources: CitationSource[];
  confidence_score: number;
  processing_time: number;
}
