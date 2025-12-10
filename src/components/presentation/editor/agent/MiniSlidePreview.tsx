"use client";

import { PlateSlide } from "@/components/presentation/utils/parser";
import { cn } from "@/lib/utils";

interface MiniSlidePreviewProps {
  slide: PlateSlide;
  label: string;
  highlight?: boolean;
  zoom?: boolean; // For larger preview in modal
}

export function MiniSlidePreview({ slide, label, highlight, zoom = false }: MiniSlidePreviewProps) {
  return (
    <div className={cn(
      "border-2 rounded-lg overflow-hidden transition-all",
      highlight ? "border-green-500 shadow-lg" : "border-gray-300"
    )}>
      {/* Label */}
      <div className={cn(
        "px-3 py-1.5 text-xs font-semibold flex items-center justify-between",
        highlight ? "bg-green-100 text-green-900" : "bg-gray-100 text-gray-700"
      )}>
        <span>{label}</span>
        {highlight && (
          <span className="text-[10px] bg-green-500 text-white px-2 py-0.5 rounded-full">
            NEW
          </span>
        )}
      </div>

      {/* Slide Preview */}
      <div 
        className="relative bg-white"
        style={{
          aspectRatio: '16/9',
          width: '100%',
        }}
      >
        <div
          className="absolute inset-0 overflow-hidden"
          style={{
            backgroundColor: slide.bgColor || '#ffffff',
            transform: zoom ? 'scale(0.5)' : 'scale(0.25)',
            transformOrigin: 'top left',
            width: zoom ? '200%' : '400%',
            height: zoom ? '200%' : '400%',
          }}
        >
          {/* Root Image Background */}
          {slide.rootImage && (
            <img
              src={slide.rootImage}
              alt=""
              className="absolute inset-0 w-full h-full object-cover opacity-20"
            />
          )}

          {/* Content Container */}
          <div className="relative w-full h-full p-16">
            <div className={cn(
              "h-full overflow-hidden",
              slide.alignment === 'center' && "flex flex-col justify-center items-center text-center",
              slide.alignment === 'left' && "flex flex-col justify-center items-start text-left",
              slide.alignment === 'right' && "flex flex-col justify-center items-end text-right"
            )}>
              <div className="prose prose-sm max-w-none pointer-events-none">
                {slide.content.map((node, idx) => (
                  <MiniNodeRenderer key={idx} node={node} />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Footer */}
      <div className="px-3 py-1.5 bg-gray-50 border-t border-gray-200 flex items-center justify-between text-[10px] text-gray-600">
        <span>{slide.content.length} elements</span>
        <span>{slide.alignment || 'center'}</span>
      </div>
    </div>
  );
}

// Simple node renderer for mini preview
function MiniNodeRenderer({ node }: { node: any }) {
  const extractText = (n: any): string => {
    if (typeof n === 'string') return n;
    if (n.text) return n.text;
    if (n.children) {
      return n.children.map(extractText).filter(Boolean).join(' ');
    }
    return '';
  };
  
  const text = extractText(node);
  
  switch (node.type) {
    case 'h1':
      return <h1 className="text-4xl font-bold mb-4">{text}</h1>;
    case 'h2':
      return <h2 className="text-3xl font-bold mb-3">{text}</h2>;
    case 'h3':
      return <h3 className="text-2xl font-semibold mb-2">{text}</h3>;
    case 'p':
      return <p className="text-base mb-2">{text}</p>;
    case 'ul':
      return (
        <ul className="list-disc list-inside mb-2">
          {node.children?.map((child: any, idx: number) => (
            <li key={idx} className="mb-1">
              {extractText(child)}
            </li>
          ))}
        </ul>
      );
    case 'ol':
      return (
        <ol className="list-decimal list-inside mb-2">
          {node.children?.map((child: any, idx: number) => (
            <li key={idx} className="mb-1">
              {extractText(child)}
            </li>
          ))}
        </ol>
      );
    default:
      return text ? <div className="text-sm mb-1">{text}</div> : null;
  }
}
