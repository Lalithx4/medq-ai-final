// File text extraction utilities
// Uses server-side processing for PDFs and documents

import { FileType } from '../types';

// Extract text from various file types
export async function extractTextFromFile(
  fileUrl: string,
  fileType: FileType
): Promise<{ text: string; pageCount?: number; wordCount: number }> {
  try {
    // For images, we don't extract text (could add OCR later)
    if (['image', 'png', 'jpg', 'jpeg', 'gif', 'webp'].includes(fileType)) {
      return { text: '', wordCount: 0 };
    }
    
    // Fetch the file
    const response = await fetch(fileUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch file: ${response.status}`);
    }
    
    const contentType = response.headers.get('content-type') || '';
    
    // Handle text files directly
    if (fileType === 'txt' || fileType === 'md' || contentType.includes('text/')) {
      const text = await response.text();
      return {
        text,
        wordCount: countWords(text),
      };
    }
    
    // For PDFs and documents, we need server-side processing
    // This will be handled by the /api/file-manager/process endpoint
    // Return empty for now - processing happens separately
    return { text: '', wordCount: 0 };
  } catch (error) {
    console.error('Error extracting text:', error);
    return { text: '', wordCount: 0 };
  }
}

// Count words in text
export function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

// Extract text from PDF using pdf-parse (server-side only)
export async function extractTextFromPDF(buffer: Buffer): Promise<{
  text: string;
  pageCount: number;
  wordCount: number;
}> {
  try {
    // Dynamic import for server-side only
    // pdf-parse is an optional dependency - eslint-disable-next-line
    // @ts-expect-error - optional dependency
    const pdfParse = await import('pdf-parse').then(m => m.default || m).catch(() => null);
    if (!pdfParse) {
      console.warn('pdf-parse not installed. Run: npm install pdf-parse');
      return { text: '', pageCount: 0, wordCount: 0 };
    }
    const data = await pdfParse(buffer);
    
    return {
      text: data.text,
      pageCount: data.numpages,
      wordCount: countWords(data.text),
    };
  } catch (error) {
    console.error('Error parsing PDF:', error);
    return { text: '', pageCount: 0, wordCount: 0 };
  }
}

// Extract text from DOCX using mammoth (server-side only)
export async function extractTextFromDOCX(buffer: Buffer): Promise<{
  text: string;
  wordCount: number;
}> {
  try {
    // Dynamic import for server-side only
    // mammoth is an optional dependency
    // @ts-expect-error - optional dependency
    const mammoth = await import('mammoth').catch(() => null);
    if (!mammoth) {
      console.warn('mammoth not installed. Run: npm install mammoth');
      return { text: '', wordCount: 0 };
    }
    const result = await mammoth.extractRawText({ buffer });
    
    return {
      text: result.value,
      wordCount: countWords(result.value),
    };
  } catch (error) {
    console.error('Error parsing DOCX:', error);
    return { text: '', wordCount: 0 };
  }
}

// Clean extracted text
export function cleanExtractedText(text: string): string {
  return text
    // Remove excessive whitespace
    .replace(/\s+/g, ' ')
    // Remove control characters
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    // Normalize line breaks
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    // Trim
    .trim();
}

// Truncate text for display
export function truncateText(text: string, maxLength: number = 200): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength).trim() + '...';
}
