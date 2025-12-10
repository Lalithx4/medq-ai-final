import { useState } from 'react';
import { WordViewer } from './WordViewer';
import { MedicalAssistant } from './MedicalAssistant';

interface EditorProps {
  initialContent: string;
  title: string;
}

export function ResearchEditor({ initialContent, title }: EditorProps) {
  const [content, setContent] = useState(initialContent);

  const handleAssistantAction = async (action: string, params?: any) => {
    try {
      switch (action) {
        case 'generate-paper':
          // Handle paper generation
          break;
        case 'generate-case':
          // Handle case study generation
          break;
        case 'continue-writing':
          // Handle continuing the writing
          break;
        case 'add-citations':
          // Handle adding citations
          break;
        case 'improve-section':
          // Handle improving a section
          break;
        case 'add-section':
          // Handle adding a new section
          break;
        case 'chat':
          // Handle chat messages
          if (params?.message) {
            const response = await fetch('/api/medical-assistant/chat', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                message: params.message,
                content: content,
              }),
            });

            if (response.ok) {
              const data = await response.json();
              if (data.updatedContent) {
                setContent(data.updatedContent);
              }
            }
          }
          break;
      }
    } catch (error) {
      console.error('Error handling assistant action:', error);
    }
  };

  return (
    <div className="flex h-screen">
      {/* Main Document Area */}
      <div className="flex-1 bg-background">
        <WordViewer content={content} title={title} />
      </div>

      {/* Assistant Sidebar */}
      <div className="w-96">
        <MedicalAssistant onAction={handleAssistantAction} />
      </div>
    </div>
  );
}