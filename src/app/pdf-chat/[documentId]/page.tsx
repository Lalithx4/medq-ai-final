'use client';

import { AppLayout } from '@/components/home/AppLayout';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import ChatInterface from '@/components/pdf-chat/ChatInterface';
import { AnalysisPanel } from '@/components/pdf-chat/AnalysisPanel';
import { ArticlePanel } from '@/components/pdf-chat/ArticlePanel';
import { Loader2, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { PDFDocument, ChatSession } from '@/lib/pdf-chat/types';

export default function PDFChatDocumentPage() {
  const params = useParams();
  const router = useRouter();
  const documentId = params.documentId as string;
  
  // Check for sessionId in URL query params
  const [urlSessionId, setUrlSessionId] = useState<string | null>(null);

  const [document, setDocument] = useState<PDFDocument | null>(null);
  const [session, setSession] = useState<ChatSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'chat' | 'analysis' | 'article'>('chat');

  useEffect(() => {
    // Get sessionId from URL if present
    const searchParams = new URLSearchParams(window.location.search);
    const sessionId = searchParams.get('sessionId');
    if (sessionId) {
      setUrlSessionId(sessionId);
    }
  }, []);

  useEffect(() => {
    async function loadDocument() {
      try {
        // Fetch document details
        const docResponse = await fetch(`/api/pdf-chat/documents/${documentId}`);
        if (!docResponse.ok) {
          throw new Error('Document not found');
        }
        const docData = await docResponse.json();
        setDocument(docData.document);

        // Check if document is ready
        if (docData.document.status === 'processing') {
          setError('Document is still processing. Please wait...');
          // Poll for status updates
          const interval = setInterval(async () => {
            const statusResponse = await fetch(`/api/pdf-chat/documents/${documentId}`);
            const statusData = await statusResponse.json();
            if (statusData.document.status === 'ready') {
              setDocument(statusData.document);
              setError(null);
              clearInterval(interval);
            } else if (statusData.document.status === 'error') {
              setError(statusData.document.error_message || 'Processing failed');
              clearInterval(interval);
            }
          }, 3000);
          return;
        }

        if (docData.document.status === 'error') {
          throw new Error(docData.document.error_message || 'Document processing failed');
        }

        // Get or create a chat session
        if (urlSessionId) {
          // Resume existing session from URL
          const sessionResponse = await fetch(`/api/pdf-chat/sessions?documentId=${documentId}`);
          const sessionData = await sessionResponse.json();
          const existingSession = sessionData.sessions?.find((s: ChatSession) => s.id === urlSessionId);
          
          if (existingSession) {
            setSession(existingSession);
          } else {
            throw new Error('Session not found');
          }
        } else {
          // Get or create new session
          const sessionsResponse = await fetch(`/api/pdf-chat/sessions?documentId=${documentId}`);
          const sessionsData = await sessionsResponse.json();

          if (sessionsData.sessions && sessionsData.sessions.length > 0) {
            // Use most recent session
            setSession(sessionsData.sessions[0]);
          } else {
            // Create new session
            const createResponse = await fetch('/api/pdf-chat/sessions', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                documentId,
                title: `Chat about ${docData.document.originalName}`,
              }),
            });
            const createData = await createResponse.json();
            setSession({
              id: createData.sessionId || createData.session_id,
              documentId: documentId,
              userId: '',
              title: createData.title,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            });
          }
        }

        setLoading(false);
      } catch (err) {
        console.error('Error loading document:', err);
        setError(err instanceof Error ? err.message : 'Failed to load document');
        setLoading(false);
      }
    }

    loadDocument();
  }, [documentId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-gray-600">Loading document...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center max-w-md">
          <div className="text-red-500 mb-4">
            <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Error</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <Button onClick={() => router.push('/pdf-chat')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Upload
          </Button>
        </div>
      </div>
    );
  }

  if (!document || !session) {
    return null;
  }

  // Guard against missing file URL
  if (!document.fileUrl) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center max-w-md">
            <div className="text-red-500 mb-4">
              <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">File not available</h2>
            <p className="text-gray-600 mb-6">The document file URL is missing. Please re-upload the PDF.</p>
            <Button onClick={() => router.push('/pdf-chat')}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Upload
            </Button>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
    <div className="h-screen flex flex-col">
      {/* Header */}
      <div className="border-b bg-white px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push('/pdf-chat')}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <div>
              <h1 className="text-lg font-semibold text-gray-900">
                {document.originalName}
              </h1>
              <p className="text-sm text-gray-500">
                {document.pageCount ? `${document.pageCount} pages` : 'Processing...'}
              </p>
            </div>
          </div>
          <div className="mt-2 md:mt-0 flex items-end">
            <div className="flex space-x-1 border-b border-gray-200">
              <button
                type="button"
                onClick={() => setActiveTab('chat')}
                className={`px-4 py-2 text-xs rounded-t-md border border-b-0 transition-colors ${
                  activeTab === 'chat'
                    ? 'bg-white text-gray-900 border-gray-300'
                    : 'bg-gray-100 text-gray-600 border-transparent hover:text-gray-800'
                }`}
              >
                Chat
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('analysis')}
                className={`px-4 py-2 text-xs rounded-t-md border border-b-0 transition-colors ${
                  activeTab === 'analysis'
                    ? 'bg-white text-gray-900 border-gray-300'
                    : 'bg-gray-100 text-gray-600 border-transparent hover:text-gray-800'
                }`}
              >
                Analysis
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('article')}
                className={`px-4 py-2 text-xs rounded-t-md border border-b-0 transition-colors ${
                  activeTab === 'article'
                    ? 'bg-white text-gray-900 border-gray-300'
                    : 'bg-gray-100 text-gray-600 border-transparent hover:text-gray-800'
                }`}
              >
                Article
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content - Full Width Chat */}
      <div className="flex-1 flex overflow-hidden">
        <div className="w-full flex flex-col">
          {activeTab === 'chat' && (
            <ChatInterface
              sessionId={session.id}
              onPageReference={(pageNumber: number) => {
                console.log('Page reference:', pageNumber);
              }}
            />
          )}
          {activeTab === 'analysis' && <AnalysisPanel sessionId={session.id} />}
          {activeTab === 'article' && <ArticlePanel sessionId={session.id} />}
        </div>
      </div>
    </div>
    </AppLayout>
  );
}
