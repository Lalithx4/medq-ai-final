import { AppLayout } from '@/components/features/home/AppLayout';
import PDFUploader from '@/components/features/pdf-chat/PDFUploader';
import { FileText, Zap, Shield, History, FolderOpen } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function PDFChatPage() {
  return (
    <AppLayout>
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white py-12 px-4">
      <div className="max-w-5xl mx-auto">
        {/* Quick Access Bar */}
        <div className="flex justify-end gap-3 mb-8">
          <Link href="/pdf-chat/dashboard">
            <Button variant="outline" className="gap-2">
              <FolderOpen className="w-4 h-4" />
              My Documents
            </Button>
          </Link>
          <Link href="/pdf-chat/dashboard?tab=sessions">
            <Button variant="outline" className="gap-2">
              <History className="w-4 h-4" />
              Previous Sessions
            </Button>
          </Link>
        </div>

        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary/10 rounded-full mb-4">
            <FileText className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-5xl font-bold text-gray-900 mb-4">
            Chat with Your PDFs
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Upload medical documents, research papers, or clinical guidelines and get instant, citation-linked answers powered by AI
          </p>
        </div>

        {/* Uploader */}
        <PDFUploader />

        {/* Features Grid */}
        <div className="mt-20 grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
              <Zap className="w-6 h-6 text-blue-600" />
            </div>
            <h3 className="font-semibold text-gray-900 mb-2 text-lg">Lightning Fast</h3>
            <p className="text-sm text-gray-600">
              Get instant answers with advanced RAG technology and medical-specific AI models
            </p>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
              <FileText className="w-6 h-6 text-green-600" />
            </div>
            <h3 className="font-semibold text-gray-900 mb-2 text-lg">Citation-Linked</h3>
            <p className="text-sm text-gray-600">
              Every answer includes precise page references so you can verify the source
            </p>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
              <Shield className="w-6 h-6 text-purple-600" />
            </div>
            <h3 className="font-semibold text-gray-900 mb-2 text-lg">Secure & Private</h3>
            <p className="text-sm text-gray-600">
              Your documents are encrypted and never used for training AI models
            </p>
          </div>
        </div>

        {/* How It Works */}
        <div className="mt-20">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
            How It Works
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[
              { step: '1', title: 'Upload', desc: 'Drop your PDF document' },
              { step: '2', title: 'Process', desc: 'AI analyzes the content' },
              { step: '3', title: 'Ask', desc: 'Type your questions' },
              { step: '4', title: 'Learn', desc: 'Get cited answers instantly' },
            ].map((item) => (
              <div key={item.step} className="text-center">
                <div className="w-12 h-12 bg-primary text-white rounded-full flex items-center justify-center text-xl font-bold mx-auto mb-3">
                  {item.step}
                </div>
                <h4 className="font-semibold text-gray-900 mb-1">{item.title}</h4>
                <p className="text-sm text-gray-600">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
    </AppLayout>
  );
}
