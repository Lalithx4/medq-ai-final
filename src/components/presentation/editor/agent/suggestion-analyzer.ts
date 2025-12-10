import { type PlateSlide } from "@/components/presentation/utils/parser";
import { type SmartSuggestion } from "./types";

/**
 * Analyzes slides and generates smart suggestions
 */
export function analyzeSuggestions(
  slides: PlateSlide[],
  currentSlideIndex: number,
  onAction: (suggestionId: string) => Promise<void>
): SmartSuggestion[] {
  const suggestions: SmartSuggestion[] = [];
  const currentSlide = slides[currentSlideIndex];

  if (!currentSlide) return suggestions;

  // 1. Check for text-heavy slides
  const textContent = extractTextFromSlide(currentSlide);
  if (textContent.length > 500) {
    suggestions.push({
      id: 'simplify-text',
      title: 'Simplify content',
      description: 'This slide has a lot of text. Break it into bullet points.',
      icon: '✂️',
      priority: 'high',
      context: 'slide',
      action: async () => onAction('simplify-text'),
    });
  }

  // 2. Check for missing images
  const hasImage = currentSlide.rootImage?.url || 
                   currentSlide.content.some((node: any) => 
                     node.type === 'img' || node.type === 'image'
                   );
  
  if (!hasImage) {
    suggestions.push({
      id: 'add-image',
      title: 'Add visual',
      description: 'Add a relevant image to make this slide more engaging.',
      icon: '🖼️',
      priority: 'medium',
      context: 'slide',
      action: async () => onAction('add-image'),
    });
  }

  // 3. Check for complex medical terms
  const hasMedicalTerms = /ascitis|hepatic|cirrhosis|paracentesis|etiology|pathophysiology/i.test(textContent);
  if (hasMedicalTerms) {
    suggestions.push({
      id: 'add-definitions',
      title: 'Add definitions',
      description: 'Add simple definitions for medical terms.',
      icon: '📖',
      priority: 'medium',
      context: 'slide',
      action: async () => onAction('add-definitions'),
    });
  }

  // 4. Presentation-level: Check for missing conclusion
  const hasConclusion = slides.some((s) => 
    /conclusion|summary|takeaway|final/i.test(extractTextFromSlide(s))
  );
  
  if (!hasConclusion && slides.length > 5) {
    suggestions.push({
      id: 'add-conclusion',
      title: 'Add conclusion slide',
      description: 'Wrap up with key takeaways and next steps.',
      icon: '🎯',
      priority: 'low',
      context: 'presentation',
      action: async () => onAction('add-conclusion'),
    });
  }

  // Sort by priority
  return suggestions.sort((a, b) => {
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    return priorityOrder[a.priority] - priorityOrder[b.priority];
  });
}

/**
 * Extract text content from a slide
 */
function extractTextFromSlide(slide: PlateSlide): string {
  const extractText = (node: any): string => {
    if (typeof node === 'string') return node;
    if (node.text) return node.text;
    if (node.children && Array.isArray(node.children)) {
      return node.children.map(extractText).join(' ');
    }
    return '';
  };

  return slide.content.map(extractText).join(' ');
}
