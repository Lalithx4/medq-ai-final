'use client';

import { AppLayout } from '@/components/home/AppLayout';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import ChatInterface from '@/components/pdf-chat/ChatInterface';
import { AnalysisPanel } from '@/components/pdf-chat/AnalysisPanel';
import { ArticlePanel } from '@/components/pdf-chat/ArticlePanel';
import { Loader2, ArrowLeft, FileText, FolderOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Collection {
  id: string;
  name: string;
  description?: string;
  fileSearchStoreId?: string;
  createdAt: string;
  PdfDocument?: Array<{
    id: string;
    originalName: string;
    status: string;
    pageCount?: number;
    processingError?: string;
  }>;
}

interface ChatSession {
  id: string;
  collectionId: string;
  userId: string;
  title: string;
  createdAt: string;
  updatedAt: string;
}

export default function CollectionChatPage() {
  const params = useParams();
  const router = useRouter();
  const collectionId = params.collectionId as string;

  const [collection, setCollection] = useState<Collection | null>(null);
  const [session, setSession] = useState<ChatSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'chat' | 'analysis' | 'article'>('chat');

  useEffect(() => {
    async function loadSession(collectionData: any) {
      // Get or create a chat session for this collection
      const sessionsResponse = await fetch(`/api/pdf-chat/sessions?collectionId=${collectionId}`);
      const sessionsData = await sessionsResponse.json();

      if (sessionsData.sessions && sessionsData.sessions.length > 0) {
        // Use existing session
        setSession(sessionsData.sessions[0]);
      } else {
        // Create new session
        const createResponse = await fetch('/api/pdf-chat/sessions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            collectionId,
            title: `Chat with ${collectionData.name}`,
          }),
        });
        const createData = await createResponse.json();
        setSession({
          id: createData.session_id,
          collectionId: collectionId,
          userId: '',
          title: createData.title,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      }
      setLoading(false);
    }

    async function loadCollection() {
      try {
        // Fetch collection details
        const collectionRes = await fetch(`/api/pdf-chat/collections/${collectionId}`);
        if (!collectionRes.ok) {
          throw new Error('Collection not found');
        }
        const collectionData = await collectionRes.json();
        setCollection(collectionData.collection);

        // Check document statuses
        const docs = collectionData.collection.PdfDocument || [];
        const readyDocs = docs.filter((doc: any) => doc.status === 'ready');
        const errorDocs = docs.filter((doc: any) => doc.status === 'error');
        const pendingDocs = docs.filter((doc: any) => doc.status === 'pending' || doc.status === 'processing');
        
        console.log('📊 Collection document status:', {
          total: docs.length,
          ready: readyDocs.length,
          error: errorDocs.length,
          pending: pendingDocs.length,
        });

        // If ALL documents have errors and none are ready, show error
        if (readyDocs.length === 0 && errorDocs.length > 0 && pendingDocs.length === 0) {
          setError('All documents failed to process. Please try re-uploading them.');
          setLoading(false);
          return;
        }
        
        // If some documents are still processing, wait for them
        if (pendingDocs.length > 0) {
          
          setError('Some documents are still processing. Please wait...');
          
          // Poll for status updates with timeout
          let pollCount = 0;
          const maxPolls = 40; // 2 minutes max (40 * 3 seconds)
          
          const interval = setInterval(async () => {
            pollCount++;
            
            if (pollCount >= maxPolls) {
              clearInterval(interval);
              setError('Documents are taking too long to process. Please refresh the page or contact support.');
              setLoading(false);
              return;
            }
            
            const statusResponse = await fetch(`/api/pdf-chat/collections/${collectionId}`);
            const statusData = await statusResponse.json();
            
            const updatedDocs = statusData.collection.PdfDocument || [];
            const nowReadyDocs = updatedDocs.filter((doc: any) => doc.status === 'ready');
            const nowErrorDocs = updatedDocs.filter((doc: any) => doc.status === 'error');
            const nowPendingDocs = updatedDocs.filter((doc: any) => doc.status === 'pending' || doc.status === 'processing');
            
            console.log('📊 Polling status:', {
              ready: nowReadyDocs.length,
              error: nowErrorDocs.length,
              pending: nowPendingDocs.length,
            });
            
            // If no more pending docs, we can proceed
            if (nowPendingDocs.length === 0) {
              clearInterval(interval);
              
              // If at least some docs are ready, proceed (even if some have errors)
              if (nowReadyDocs.length > 0) {
                setCollection(statusData.collection);
                setError(null);
                loadSession(statusData.collection);
              } else {
                // All docs have errors
                setError('All documents failed to process. Please try re-uploading them.');
                setLoading(false);
              }
            }
          }, 3000);
          return;
        }

        // At least some documents are ready (or no pending), load session
        if (readyDocs.length > 0) {
          await loadSession(collectionData.collection);
        } else {
          setError('No documents are ready. Please upload and process documents first.');
          setLoading(false);
        }
      } catch (err) {
        console.error('Error loading collection:', err);
        setError(err instanceof Error ? err.message : 'Failed to load collection');
        setLoading(false);
      }
    }

    loadCollection();
  }, [collectionId]);

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  if (error) {
    return (
      <AppLayout>
        <div className="flex flex-col items-center justify-center min-h-screen gap-4">
          <p className="text-red-600">{error}</p>
          <Button onClick={() => router.push('/pdf-chat/dashboard')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Button>
        </div>
      </AppLayout>
    );
  }

  if (!collection || !session) {
    return (
      <AppLayout>
        <div className="flex flex-col items-center justify-center min-h-screen gap-4">
          <p className="text-gray-600">Collection not found</p>
          <Button onClick={() => router.push('/pdf-chat/dashboard')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Button>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="h-screen flex flex-col">
        {/* Header */}
        <div className="border-b bg-white px-6 py-4">
          <div className="flex items-center justify-between max-w-7xl mx-auto">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push('/pdf-chat/dashboard')}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                  <FolderOpen className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h1 className="text-lg font-semibold text-gray-900">
                      {collection.name}
                    </h1>
                    <span className="px-2 py-0.5 bg-purple-100 text-purple-700 text-xs font-medium rounded-full">
                      Multi-Doc Chat
                    </span>
                  </div>
                  <p className="text-sm text-gray-500">
                    {collection.PdfDocument?.length || 0} documents • Powered by Gemini File Search
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
        </div>

        {/* Documents List */}
        <div className="border-b bg-gray-50 px-6 py-3">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center gap-2 overflow-x-auto">
              <span className="text-sm font-medium text-gray-700 whitespace-nowrap">
                Documents:
              </span>
              {collection.PdfDocument?.filter((doc) => doc.status === 'ready').map((doc) => (
                <div
                  key={doc.id}
                  className="flex items-center gap-2 px-3 py-1.5 bg-white rounded-lg border text-sm whitespace-nowrap"
                >
                  <FileText className="w-3.5 h-3.5 text-green-500" />
                  <span className="text-gray-700">{doc.originalName}</span>
                  {doc.pageCount && (
                    <span className="text-gray-400">({doc.pageCount} pages)</span>
                  )}
                </div>
              ))}
              {collection.PdfDocument?.filter((doc) => doc.status === 'error').map((doc) => (
                <div
                  key={doc.id}
                  className="flex items-center gap-2 px-3 py-1.5 bg-red-50 rounded-lg border border-red-200 text-sm whitespace-nowrap"
                  title={doc.processingError || 'Processing failed'}
                >
                  <FileText className="w-3.5 h-3.5 text-red-400" />
                  <span className="text-red-600 line-through">{doc.originalName}</span>
                  <span className="text-red-400 text-xs">(failed)</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Chat / Analysis / Article */}
        <div className="flex-1 overflow-hidden">
          {activeTab === 'chat' && (
            <ChatInterface
              sessionId={session.id}
              onPageReference={() => {}}
            />
          )}
          {activeTab === 'analysis' && <AnalysisPanel sessionId={session.id} />}
          {activeTab === 'article' && <ArticlePanel sessionId={session.id} />}
        </div>
      </div>
    </AppLayout>
  );
}
