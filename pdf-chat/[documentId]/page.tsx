'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Loader2, MessageSquare, FileText } from 'lucide-react';
import PDFViewer from '../frontend/PDFViewer';
import ChatInterface from '../frontend/ChatInterface';
import { PDFDocument } from '@/lib/pdf-chat/types';

export default function PDFChatDocumentPage() {
  const params = useParams();
  const router = useRouter();
  const documentId = params.documentId as string;

  const [document, setDocument] = useState<PDFDocument | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [highlightedPage, setHighlightedPage] = useState<number | undefined>();
  const [activeTab, setActiveTab] = useState<'pdf' | 'summary'>('pdf');

  useEffect(() => {
    loadDocument();
  }, [documentId]);

  const loadDocument = async () => {
    try {
      setIsLoading(true);
      
      // Get document details
      const { createClient } = await import('@/lib/supabase/client');
      const supabase = createClient();
      
      const { data: doc, error: docError } = await supabase
        .from('pdf_documents')
        .select('*')
        .eq('id', documentId)
        .single();

      if (docError || !doc) {
        throw new Error('Document not found');
      }

      setDocument(doc);

      // Check if document is ready
      if (doc.status === 'processing') {
        // Poll for status updates
        pollDocumentStatus();
        return;
      }

      if (doc.status === 'error') {
        throw new Error(doc.error_message || 'Document processing failed');
      }

      // Create or get existing session
      await createSession();
    } catch (err) {
      console.error('Load error:', err);
      setError(err instanceof Error ? err.message : 'Failed to load document');
    } finally {
      setIsLoading(false);
    }
  };

  const pollDocumentStatus = async () => {
    const interval = setInterval(async () => {
      const { createClient } = await import('@/lib/supabase/client');
      const supabase = createClient();
      
      const { data: doc } = await supabase
        .from('pdf_documents')
        .select('status, error_message')
        .eq('id', documentId)
        .single();

      if (doc?.status === 'ready') {
        clearInterval(interval);
        loadDocument();
      } else if (doc?.status === 'error') {
        clearInterval(interval);
        setError(doc.error_message || 'Processing failed');
        setIsLoading(false);
      }
    }, 3000);

    // Stop polling after 5 minutes
    setTimeout(() => clearInterval(interval), 300000);
  };

  const createSession = async () => {
    try {
      // Check for existing sessions
      const sessionsResponse = await fetch(`/api/pdf-chat/sessions?documentId=${documentId}`);
      if (sessionsResponse.ok) {
        const sessions = await sessionsResponse.json();
        if (sessions.length > 0) {
          setSessionId(sessions[0].id);
          return;
        }
      }

      // Create new session
      const response = await fetch('/api/pdf-chat/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          documentId,
          title: document?.filename || 'New Chat',
        }),
      });

      if (response.ok) {
        const session = await response.json();
        setSessionId(session.id);
      }
    } catch (err) {
      console.error('Session creation error:', err);
    }
  };

  const handlePageReference = (pageNumber: number) => {
    setHighlightedPage(pageNumber);
    setActiveTab('pdf');
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-blue-500 mx-auto mb-4" />
          <p className="text-gray-600">
            {document?.status === 'processing' 
              ? 'Processing your document...' 
              : 'Loading...'}
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <FileText className="w-8 h-8 text-red-500" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Error</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => router.push('/pdf-chat')}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
          >
            Upload Another PDF
          </button>
        </div>
      </div>
    );
  }

  if (!document || !sessionId) {
    return null;
  }

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b px-4 py-3">
        <div className="flex items-center justify-between max-w-screen-2xl mx-auto">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => router.push('/pdf-chat')}
              className="p-2 hover:bg-gray-100 rounded-lg"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="font-semibold text-gray-900">{document.filename}</h1>
              <p className="text-sm text-gray-500">
                {document.page_count} pages
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => setActiveTab('pdf')}
              className={`px-4 py-2 rounded-lg flex items-center space-x-2 ${
                activeTab === 'pdf' 
                  ? 'bg-blue-100 text-blue-600' 
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <FileText className="w-4 h-4" />
              <span>PDF File</span>
            </button>
            <button
              onClick={() => setActiveTab('summary')}
              className={`px-4 py-2 rounded-lg flex items-center space-x-2 ${
                activeTab === 'summary' 
                  ? 'bg-blue-100 text-blue-600' 
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <MessageSquare className="w-4 h-4" />
              <span>Summary</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-hidden">
        <div className="h-full max-w-screen-2xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-4 p-4">
          {/* PDF Viewer */}
          <div className={`bg-white rounded-lg shadow-sm overflow-hidden ${
            activeTab === 'summary' ? 'hidden lg:block' : ''
          }`}>
            <PDFViewer 
              fileUrl={document.file_url!} 
              highlightedPage={highlightedPage}
            />
          </div>

          {/* Chat Interface */}
          <div className={`bg-white rounded-lg shadow-sm overflow-hidden ${
            activeTab === 'pdf' ? 'hidden lg:block' : ''
          }`}>
            <div className="h-full flex flex-col">
              <div className="border-b px-4 py-3">
                <h2 className="font-semibold text-gray-900 flex items-center">
                  <MessageSquare className="w-5 h-5 mr-2" />
                  Chat
                </h2>
              </div>
              <div className="flex-1 overflow-hidden">
                <ChatInterface 
                  sessionId={sessionId}
                  onPageReference={handlePageReference}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
