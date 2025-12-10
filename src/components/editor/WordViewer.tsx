import { useEffect, useRef } from 'react';
import { WordConverter } from '@/lib/research-paper/word-converter';

interface WordViewerProps {
  content: string;
  title: string;
}

export function WordViewer({ content, title }: WordViewerProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    const loadDocument = async () => {
      try {
        // Convert content to Word format
        const wordBuffer = await WordConverter.convertToWord(content, title);
        
        // Convert Node Buffer to ArrayBuffer slice, then to Blob
        const arrayBuffer = wordBuffer.buffer.slice(wordBuffer.byteOffset, wordBuffer.byteOffset + wordBuffer.byteLength);
        const blob = new Blob([arrayBuffer], { 
          type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' 
        });
        
        // Create object URL
        const url = URL.createObjectURL(blob);
        
        // Set iframe src to preview the document
        if (iframeRef.current) {
          iframeRef.current.src = url;
        }
        
        // Clean up
        return () => URL.revokeObjectURL(url);
      } catch (error) {
        console.error('Error loading Word document:', error);
      }
    };

    loadDocument();
  }, [content, title]);

  return (
    <iframe
      ref={iframeRef}
      className="w-full h-full border-0"
      title="Word Document Preview"
    />
  );
}