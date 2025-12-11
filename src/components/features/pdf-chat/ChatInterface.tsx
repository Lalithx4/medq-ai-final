"use client";

import { useState, useEffect, useRef } from "react";
import { Send, Loader2, FileText } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { ChatMessage } from "@/lib/pdf-chat/types";

interface ChatInterfaceProps {
  sessionId: string;
  onPageReference?: (pageNumber: number) => void;
}

export default function ChatInterface({ sessionId, onPageReference }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [actionLoading, setActionLoading] = useState<null | 'pdf_summary' | 'slides' | 'pdf_summary_docx'>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadMessages();
  }, [sessionId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadMessages = async () => {
    try {
      setIsLoadingHistory(true);
      const response = await fetch(`/api/pdf-chat/messages?sessionId=${sessionId}`);
      if (response.ok) {
        const data = await response.json();
        setMessages(data.messages || []);
      }
    } catch (error) {
      console.error('Failed to load messages:', error);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    setIsLoading(true);

    // Add user message optimistically
    const tempUserMessage: ChatMessage = {
      id: 'temp-' + Date.now(),
      sessionId: sessionId,
      role: 'user',
      content: userMessage,
      createdAt: new Date().toISOString(),
    };
    setMessages(prev => [...prev, tempUserMessage]);
    setInput('');

    try {
      console.log('[ChatInterface] Sending chat request', {
        sessionId,
        message: userMessage,
      });

      const response = await fetch('/api/pdf-chat/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          message: userMessage,
        }),
      });

      console.log('[ChatInterface] Chat response status', response.status);

      let data: any = null;
      try {
        data = await response.json();
        console.log('[ChatInterface] Chat response body', data);
      } catch (parseErr) {
        console.error('[ChatInterface] Failed to parse chat response JSON', parseErr);
      }

      if (!response.ok) {
        console.error('[ChatInterface] Chat request failed', {
          status: response.status,
          body: data,
        });
        throw new Error(data?.error || 'Failed to get response');
      }

      // Add assistant message
      let assistantContent = data.content;
      
      // Prepend warning if answer is not grounded
      if (data.warning) {
        console.warn('[ChatInterface] Ungrounded answer warning:', data.warning);
        assistantContent = `⚠️ **Warning:** ${data.warning}\n\n${data.content}`;
      }
      
      const assistantMessage: ChatMessage = {
        id: data.messageId,
        sessionId: sessionId,
        role: 'assistant',
        content: assistantContent,
        sources: data.sources,
        createdAt: new Date().toISOString(),
      };

      setMessages(prev => prev.map(msg => 
        msg.id === tempUserMessage.id ? assistantMessage : msg
      ));
    } catch (error) {
      console.error('[ChatInterface] Error sending message', error);
      
      // Add error message
      const errorMessage: ChatMessage = {
        id: 'error-' + Date.now(),
        sessionId: sessionId,
        role: 'assistant',
        content: 'Sorry, I encountered an error talking to the document. Please check the console logs and try again.',
        createdAt: new Date().toISOString(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await handleSend();
  };

  const handleAction = async (action: 'pdf_summary' | 'slides' | 'pdf_summary_docx') => {
    if (actionLoading || isLoadingHistory) return;
    setActionLoading(action);

    try {
      const response = await fetch('/api/pdf-chat/actions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, sessionId }),
      });

      const data = await response.json();
      if (!response.ok) {
        console.error('[ChatInterface] PDF action failed', { action, data });
        return;
      }

      // Optimistically append the new assistant message from the action
      const newMessage: ChatMessage = {
        id: data.messageId,
        sessionId,
        role: 'assistant',
        content: data.content,
        downloadUrl: data.downloadUrl,
        action: data.action,
        createdAt: new Date().toISOString(),
      };

      setMessages(prev => [...prev, newMessage]);
    } catch (error) {
      console.error('[ChatInterface] Error running PDF action', action, error);
    } finally {
      setActionLoading(null);
    }
  };

  const handlePageClick = (pageNumber: number) => {
    if (onPageReference) {
      onPageReference(pageNumber);
    }
  };

  if (isLoadingHistory) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-400">
            <FileText className="w-16 h-16 mb-4" />
            <p className="text-lg">Ask any question about this document</p>
            <p className="text-sm mt-2">Try asking about specific topics or requesting summaries</p>
          </div>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] rounded-lg p-4 ${
                  message.role === 'user'
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 text-gray-800'
                }`}
              >
                {message.role === "assistant" ? (
                  <>
                    <div className="prose prose-sm max-w-none dark:prose-invert">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {message.content}
                      </ReactMarkdown>
                    </div>
                    {/* Optional download link for generated artifacts */}
                    {message.downloadUrl && (
                      <div className="mt-2">
                        <a
                          href={message.downloadUrl}
                          className="inline-flex items-center text-xs text-blue-600 hover:underline"
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          {message.action === 'slides'
                            ? 'Download PPTX slides'
                            : message.action === 'pdf_summary_docx'
                            ? 'Download summary DOCX'
                            : 'Download summary PDF'}
                        </a>
                      </div>
                    )}
                  </>
                ) : (
                  <p className="whitespace-pre-wrap text-white font-medium">{message.content}</p>
                )}
                
                {message.sources && message.sources.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-gray-300">
                    <p className="text-xs font-semibold mb-2">Sources:</p>
                    <div className="space-y-1">
                      {message.sources.map((source, idx) => (
                        <button
                          key={idx}
                          onClick={() => handlePageClick(source.pageNumber)}
                          className="block text-xs hover:underline text-left"
                        >
                          📄 Page {source.pageNumber} (relevance: {Math.round(source.similarity * 100)}%)
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
        
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-gray-100 rounded-lg p-4">
              <Loader2 className="w-5 h-5 animate-spin text-gray-500" />
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t p-4">
        <form onSubmit={handleSubmit} className="flex flex-col gap-2">
          <div className="flex space-x-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask any question..."
              className="flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={isLoading}
            />
            <button
              type="submit"
              disabled={isLoading || !input.trim()}
              className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Send className="w-5 h-5" />
              )}
            </button>
          </div>

          <div className="flex items-center justify-between gap-2 text-sm text-gray-500">
            <label className="flex items-center space-x-2">
              <input type="checkbox" className="rounded" defaultChecked />
              <span>High Quality</span>
            </label>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => handleAction('pdf_summary')}
                disabled={!!actionLoading}
                className="px-3 py-1 rounded-md text-xs text-white bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {actionLoading === 'pdf_summary' ? 'Exporting PDF…' : 'Export as PDF'}
              </button>
              <button
                type="button"
                onClick={() => handleAction('slides')}
                disabled={!!actionLoading}
                className="px-3 py-1 rounded-md text-xs text-white bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {actionLoading === 'slides' ? 'Exporting PPTX…' : 'Export as PPTX'}
              </button>
              <button
                type="button"
                onClick={() => handleAction('pdf_summary_docx')}
                disabled={!!actionLoading}
                className="px-3 py-1 rounded-md text-xs text-white bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {actionLoading === 'pdf_summary_docx' ? 'Exporting DOCX…' : 'Export as DOCX'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
