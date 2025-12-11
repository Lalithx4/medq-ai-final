'use client';

import { useState, useEffect } from 'react';
import { AppLayout } from '@/components/features/home/AppLayout';
import { FileText, MessageSquare, Clock, Trash2, Eye, Plus, FolderOpen } from 'lucide-react';
import Link from 'next/link';
import { PDFDocument } from '@/lib/pdf-chat/types';

interface Session {
  id: string;
  documentId: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messageCount?: number;
  pdf_documents?: {
    filename: string;
    original_filename: string;
  };
}

interface Collection {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  PdfDocument?: PDFDocument[];
}

export default function PDFChatDashboard() {
  const [documents, setDocuments] = useState<PDFDocument[]>([]);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'documents' | 'collections' | 'sessions'>('documents');

  useEffect(() => {
    // Check URL for tab parameter
    const params = new URLSearchParams(window.location.search);
    const tab = params.get('tab');
    if (tab === 'sessions') {
      setActiveTab('sessions');
    }
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      // Load documents
      const docsRes = await fetch('/api/pdf-chat/documents');
      if (docsRes.ok) {
        const docsData = await docsRes.json();
        setDocuments(docsData.documents || []);
      }

      // Load collections
      const collectionsRes = await fetch('/api/pdf-chat/collections');
      if (collectionsRes.ok) {
        const collectionsData = await collectionsRes.json();
        setCollections(collectionsData.collections || []);
      }

      // Load all sessions
      const sessionsRes = await fetch('/api/pdf-chat/sessions/all');
      if (sessionsRes.ok) {
        const sessionsData = await sessionsRes.json();
        setSessions(sessionsData.sessions || []);
      }
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const deleteDocument = async (documentId: string) => {
    if (!confirm('Are you sure you want to delete this document and all its chat sessions?')) {
      return;
    }

    try {
      const res = await fetch(`/api/pdf-chat/documents/${documentId}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        setDocuments(docs => docs.filter(d => d.id !== documentId));
        setSessions(sessions => sessions.filter(s => s.documentId !== documentId));
      }
    } catch (error) {
      console.error('Failed to delete document:', error);
    }
  };

  const deleteSession = async (sessionId: string) => {
    if (!confirm('Are you sure you want to delete this chat session?')) {
      return;
    }

    try {
      const res = await fetch(`/api/pdf-chat/sessions/${sessionId}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        setSessions(sessions => sessions.filter(s => s.id !== sessionId));
      }
    } catch (error) {
      console.error('Failed to delete session:', error);
    }
  };

  const deleteCollection = async (collectionId: string) => {
    if (!confirm('Are you sure you want to delete this collection? Documents will remain but will no longer be grouped.')) {
      return;
    }

    try {
      const res = await fetch(`/api/pdf-chat/collections/${collectionId}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        setCollections(cols => cols.filter(c => c.id !== collectionId));
        loadData(); // Reload to update document counts
      }
    } catch (error) {
      console.error('Failed to delete collection:', error);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <AppLayout>
      <div className="min-h-screen bg-gray-50 py-8 px-4">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">PDF Chat Dashboard</h1>
              <p className="text-gray-600 mt-1">Manage your documents and chat sessions</p>
            </div>
            <Link
              href="/pdf-chat"
              className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Upload New PDF
            </Link>
          </div>

          {/* Tabs */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
            <div className="flex border-b border-gray-200">
              <button
                onClick={() => setActiveTab('documents')}
                className={`flex-1 px-6 py-4 text-sm font-medium transition-colors ${
                  activeTab === 'documents'
                    ? 'text-primary border-b-2 border-primary'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <div className="flex items-center justify-center gap-2">
                  <FileText className="w-4 h-4" />
                  Documents ({documents.filter(d => !d.collectionId).length})
                </div>
              </button>
              <button
                onClick={() => setActiveTab('collections')}
                className={`flex-1 px-6 py-4 text-sm font-medium transition-colors ${
                  activeTab === 'collections'
                    ? 'text-primary border-b-2 border-primary'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <div className="flex items-center justify-center gap-2">
                  <FileText className="w-4 h-4" />
                  Collections ({collections.length})
                </div>
              </button>
              <button
                onClick={() => setActiveTab('sessions')}
                className={`flex-1 px-6 py-4 text-sm font-medium transition-colors ${
                  activeTab === 'sessions'
                    ? 'text-primary border-b-2 border-primary'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <div className="flex items-center justify-center gap-2">
                  <MessageSquare className="w-4 h-4" />
                  Chat Sessions ({sessions.length})
                </div>
              </button>
            </div>

            {/* Content */}
            <div className="p-6">
              {isLoading ? (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
                  <p className="text-gray-500 mt-4">Loading...</p>
                </div>
              ) : activeTab === 'documents' ? (
                // Documents List
                <div className="space-y-4">
                  {documents.filter(d => !d.collectionId).length === 0 ? (
                    <div className="text-center py-12">
                      <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                      <p className="text-gray-500 mb-4">
                        {documents.length === 0 
                          ? 'No documents uploaded yet' 
                          : 'All your documents are in collections'}
                      </p>
                      <p className="text-sm text-gray-400 mb-4">
                        {documents.length === 0 
                          ? 'Upload a single PDF to get started' 
                          : 'Check the Collections tab to see your grouped documents'}
                      </p>
                      <Link
                        href="/pdf-chat"
                        className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
                      >
                        <Plus className="w-4 h-4" />
                        Upload New PDF
                      </Link>
                    </div>
                  ) : (
                    documents.filter(d => !d.collectionId).map((doc) => (
                      <div
                        key={doc.id}
                        className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                      >
                        <div className="flex items-center gap-4 flex-1">
                          <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                            <FileText className="w-6 h-6 text-primary" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-medium text-gray-900 truncate">
                              {doc.originalName}
                            </h3>
                            <div className="flex items-center gap-4 mt-1 text-sm text-gray-500">
                              <span className="flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {formatDate(doc.createdAt)}
                              </span>
                              {doc.pageCount && (
                                <span>{doc.pageCount} pages</span>
                              )}
                              <span className={`px-2 py-0.5 rounded-full text-xs ${
                                doc.status === 'ready'
                                  ? 'bg-green-100 text-green-700'
                                  : doc.status === 'processing'
                                  ? 'bg-yellow-100 text-yellow-700'
                                  : 'bg-red-100 text-red-700'
                              }`}>
                                {doc.status}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Link
                            href={`/pdf-chat/${doc.id}`}
                            className="p-2 text-gray-600 hover:text-primary hover:bg-white rounded-lg transition-colors"
                            title="View document"
                          >
                            <Eye className="w-5 h-5" />
                          </Link>
                          <button
                            onClick={() => deleteDocument(doc.id)}
                            className="p-2 text-gray-600 hover:text-red-600 hover:bg-white rounded-lg transition-colors"
                            title="Delete document"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              ) : activeTab === 'collections' ? (
                // Collections List
                <div className="space-y-4">
                  {collections.length === 0 ? (
                    <div className="text-center py-12">
                      <FolderOpen className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                      <p className="text-gray-500 mb-4">No collections yet</p>
                      <p className="text-sm text-gray-400">Upload multiple PDFs at once to create a collection</p>
                    </div>
                  ) : (
                    collections.map((collection) => (
                      <div
                        key={collection.id}
                        className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                      >
                        <div className="flex items-center gap-4 flex-1">
                          <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                            <FolderOpen className="w-6 h-6 text-purple-600" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-medium text-gray-900 truncate">
                              {collection.name}
                            </h3>
                            <div className="flex items-center gap-4 mt-1 text-sm text-gray-500">
                              <span className="flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {formatDate(collection.createdAt)}
                              </span>
                              <span>
                                {collection.PdfDocument?.length || 0} documents
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Link
                            href={`/pdf-chat/collection/${collection.id}`}
                            className="p-2 text-gray-600 hover:text-primary hover:bg-white rounded-lg transition-colors"
                            title="Chat with collection"
                          >
                            <Eye className="w-5 h-5" />
                          </Link>
                          <button
                            onClick={() => deleteCollection(collection.id)}
                            className="p-2 text-gray-600 hover:text-red-600 hover:bg-white rounded-lg transition-colors"
                            title="Delete collection"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              ) : (
                // Sessions List
                <div className="space-y-4">
                  {sessions.length === 0 ? (
                    <div className="text-center py-12">
                      <MessageSquare className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                      <p className="text-gray-500">No chat sessions yet</p>
                    </div>
                  ) : (
                    sessions.map((session) => (
                      <div
                        key={session.id}
                        className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                      >
                        <div className="flex items-center gap-4 flex-1">
                          <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                            <MessageSquare className="w-6 h-6 text-blue-600" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-medium text-gray-900 truncate">
                              {session.title}
                            </h3>
                            <div className="flex items-center gap-4 mt-1 text-sm text-gray-500">
                              <span className="flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {formatDate(session.updatedAt)}
                              </span>
                              {session.pdf_documents && (
                                <span className="truncate">
                                  {session.pdf_documents.original_filename}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Link
                            href={`/pdf-chat/${session.documentId}?sessionId=${session.id}`}
                            className="p-2 text-gray-600 hover:text-primary hover:bg-white rounded-lg transition-colors"
                            title="Resume chat"
                          >
                            <Eye className="w-5 h-5" />
                          </Link>
                          <button
                            onClick={() => deleteSession(session.id)}
                            className="p-2 text-gray-600 hover:text-red-600 hover:bg-white rounded-lg transition-colors"
                            title="Delete session"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
