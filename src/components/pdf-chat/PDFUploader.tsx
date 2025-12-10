'use client';

import { useState, useCallback } from 'react';
import { Upload, FileText, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface PDFUploaderProps {
  onUploadComplete?: (documentId: string) => void;
}

export default function PDFUploader({ onUploadComplete }: PDFUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [uploadedFiles, setUploadedFiles] = useState<{name: string, id: string, status: 'uploading' | 'processing' | 'done' | 'error'}[]>([]);
  const router = useRouter();

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = Array.from(e.dataTransfer.files);
    const pdfFiles = files.filter(file => file.type === 'application/pdf');
    
    if (pdfFiles.length > 0) {
      handleMultipleUploads(pdfFiles);
    } else {
      setError('Please upload PDF files');
    }
  }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleMultipleUploads(Array.from(files));
    }
  }, []);

  const handleMultipleUploads = async (files: File[]) => {
    setIsUploading(true);
    setError(null);
    setUploadedFiles([]);

    const fileStatuses = files.map(f => ({ name: f.name, id: '', status: 'uploading' as const }));
    setUploadedFiles(fileStatuses);

    let collectionId: string | null = null;

    try {
      // Create a collection if multiple files
      if (files.length > 1) {
        console.log(`📁 Creating collection for ${files.length} files...`);
        const collectionName = `Collection - ${new Date().toLocaleString()}`;
        const collectionRes = await fetch('/api/pdf-chat/collections', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: collectionName }),
        });
        
        if (collectionRes.ok) {
          const { collectionId: cId } = await collectionRes.json();
          collectionId = cId;
          console.log(`✅ Collection created: ${collectionId}`);
        } else {
          const errorData = await collectionRes.json();
          console.error('❌ Failed to create collection:', errorData);
          throw new Error(`Failed to create collection: ${errorData.error || 'Unknown error'}`);
        }
      }

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (!file) continue;
        
        try {
          // Validate file size (100MB max)
          if (file.size > 100 * 1024 * 1024) {
            throw new Error('File size exceeds 100MB limit');
          }

          const formData = new FormData();
          formData.append('file', file);
          if (collectionId) {
            formData.append('collectionId', collectionId);
          }

          // Upload file
          const uploadResponse = await fetch('/api/pdf-chat/upload', {
            method: 'POST',
            body: formData,
          });

          if (!uploadResponse.ok) {
            const errorData = await uploadResponse.json();
            throw new Error(errorData.error || 'Upload failed');
          }

          const { documentId } = await uploadResponse.json();
          
          // Update status to processing
          setUploadedFiles(prev => prev.map((f, idx) => 
            idx === i ? { ...f, id: documentId, status: 'processing' } : f
          ));

          // Process PDF
          const processResponse = await fetch('/api/pdf-chat/process', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ documentId }),
          });

          if (!processResponse.ok) {
            const errorData = await processResponse.json();
            throw new Error(errorData.error || 'Processing failed');
          }

          // Update status to done
          setUploadedFiles(prev => prev.map((f, idx) => 
            idx === i ? { ...f, status: 'done' } : f
          ));
          
          setUploadProgress(((i + 1) / files.length) * 100);
        } catch (err) {
          console.error(`Upload error for ${file.name}:`, err);
          setUploadedFiles(prev => prev.map((f, idx) => 
            idx === i ? { ...f, status: 'error' } : f
          ));
        }
      }

      // After all uploads, redirect to collection chat or dashboard
      setTimeout(() => {
        if (onUploadComplete) {
          const firstSuccess = uploadedFiles.find(f => f.status === 'done');
          if (firstSuccess && firstSuccess.id) onUploadComplete(firstSuccess.id);
        } else if (collectionId) {
          router.push(`/pdf-chat/collection/${collectionId}`);
        } else {
          const firstSuccess = uploadedFiles.find(f => f.status === 'done');
          if (firstSuccess && firstSuccess.id) {
            router.push(`/pdf-chat/${firstSuccess.id}`);
          } else {
            router.push('/pdf-chat/dashboard');
          }
        }
      }, 1500);
    } catch (err) {
      console.error('Upload error:', err);
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setTimeout(() => {
        setIsUploading(false);
        setUploadProgress(0);
      }, 2000);
    }
  };

  const handleTrySample = () => {
    // You can implement a sample PDF download/upload here
    alert('Sample PDF feature coming soon!');
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      <div
        className={`
          relative border-2 border-dashed rounded-lg p-12 text-center
          transition-all duration-200
          ${isDragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300 bg-white'}
          ${isUploading ? 'opacity-50 pointer-events-none' : 'hover:border-gray-400'}
        `}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {isUploading ? (
          <div className="space-y-4">
            <Loader2 className="w-16 h-16 mx-auto text-blue-500 animate-spin" />
            <div className="space-y-2">
              <p className="text-lg font-medium text-gray-700">
                Uploading {uploadedFiles.length} file{uploadedFiles.length > 1 ? 's' : ''}...
              </p>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
              <div className="text-left space-y-1 max-h-40 overflow-y-auto">
                {uploadedFiles.map((file, idx) => (
                  <div key={idx} className="flex items-center gap-2 text-sm">
                    <span className={`w-2 h-2 rounded-full ${
                      file.status === 'done' ? 'bg-green-500' :
                      file.status === 'error' ? 'bg-red-500' :
                      file.status === 'processing' ? 'bg-yellow-500' :
                      'bg-blue-500 animate-pulse'
                    }`} />
                    <span className="text-gray-700 truncate">{file.name}</span>
                    <span className="text-gray-500 text-xs ml-auto">
                      {file.status === 'done' ? '✓' : file.status === 'error' ? '✗' : '...'}
                    </span>
                  </div>
                ))}
              </div>
              <p className="text-sm text-gray-500">
                This may take a few moments
              </p>
            </div>
          </div>
        ) : (
          <>
            <FileText className="w-16 h-16 mx-auto text-gray-400 mb-4" />
            <h3 className="text-xl font-semibold text-gray-700 mb-2">
              Drag and drop or click here to browse
            </h3>
            <p className="text-gray-500 mb-4">Max. 100 MB per file</p>
            
            <input
              type="file"
              accept=".pdf,application/pdf"
              onChange={handleFileSelect}
              className="hidden"
              id="pdf-upload"
              disabled={isUploading}
              multiple
            />
            
            <label
              htmlFor="pdf-upload"
              className="inline-flex items-center px-6 py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600 cursor-pointer transition-colors"
            >
              <Upload className="w-5 h-5 mr-2" />
              Upload PDFs
            </label>

            <div className="mt-4">
              <button
                onClick={handleTrySample}
                className="text-blue-500 hover:text-blue-600 text-sm"
              >
                Or Try a sample pdf
              </button>
            </div>
          </>
        )}
      </div>

      {error && (
        <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-600 text-sm">{error}</p>
        </div>
      )}
    </div>
  );
}
