import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { SendIcon, PlusIcon, SparklesIcon, FileTextIcon } from 'lucide-react';

interface MedicalAssistantProps {
  onAction: (action: string, params?: any) => void;
}

export function MedicalAssistant({ onAction }: MedicalAssistantProps) {
  const [message, setMessage] = useState('');

  const quickActions = [
    {
      label: 'Generate Paper',
      icon: FileTextIcon,
      action: 'generate-paper'
    },
    {
      label: 'Generate Case Study',
      icon: SparklesIcon,
      action: 'generate-case'
    },
    {
      label: 'Continue Writing',
      icon: PlusIcon,
      action: 'continue-writing'
    },
    {
      label: 'Add Citations',
      icon: FileTextIcon,
      action: 'add-citations'
    },
    {
      label: 'Improve Section',
      icon: SparklesIcon,
      action: 'improve-section'
    },
    {
      label: 'Add Section',
      icon: PlusIcon,
      action: 'add-section'
    }
  ];

  return (
    <div className="flex flex-col h-full bg-card border-l border-border">
      <div className="p-4 border-b border-border">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <SparklesIcon className="w-5 h-5 text-primary" />
          AI Medical Assistant
        </h2>
      </div>

      {/* Quick Actions */}
      <div className="p-4 border-b border-border">
        <h3 className="text-sm font-medium mb-3">QUICK ACTIONS</h3>
        <div className="grid grid-cols-2 gap-2">
          {quickActions.map((action) => (
            <Button 
              key={action.action}
              variant="outline"
              className="flex items-center gap-2 w-full"
              onClick={() => onAction(action.action)}
            >
              <action.icon className="w-4 h-4" />
              {action.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Chat Interface */}
      <div className="flex-1 flex flex-col">
        <div className="flex-1 p-4 overflow-y-auto">
          {/* Messages would go here */}
        </div>
        
        {/* Input */}
        <div className="p-4 border-t border-border">
          <div className="flex gap-2">
            <input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Ask me anything about your medical document..."
              className="flex-1 px-3 py-2 rounded-lg border border-border bg-background"
            />
            <Button
              onClick={() => {
                if (message.trim()) {
                  onAction('chat', { message });
                  setMessage('');
                }
              }}
            >
              <SendIcon className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}