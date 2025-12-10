import { GoogleGenAI } from '@google/genai';

// Initialize Gemini client
const genai = new GoogleGenAI({
  apiKey: process.env.GOOGLE_AI_API_KEY || '',
});

// AI Tag categories
const TAG_CATEGORIES = [
  'Medical',
  'Research',
  'Clinical',
  'Academic',
  'Legal',
  'Financial',
  'Technical',
  'Educational',
  'Report',
  'Case Study',
  'Review',
  'Protocol',
  'Guidelines',
  'Presentation',
  'Data',
  'Analysis',
];

// Generate AI tags for a file based on its content
export async function generateAITags(
  content: string,
  filename: string
): Promise<{ tags: string[]; category: string; summary: string }> {
  try {
    const response = await genai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: `You are an AI that analyzes documents and generates relevant tags and categories.
          
Available categories: ${TAG_CATEGORIES.join(', ')}

Analyze this document:

Filename: ${filename}

Content (first 2000 chars):
${content.slice(0, 2000)}

Respond in JSON format only (no markdown):
{
  "tags": ["tag1", "tag2", "tag3", "tag4", "tag5"],
  "category": "one of the categories above",
  "summary": "A brief 1-2 sentence summary of the document"
}

Generate 3-5 relevant tags that describe the document's content, topic, and type.
Tags should be specific and useful for search and organization.`,
    });

    const text = response.text?.replace(/```json\n?|\n?```/g, '').trim() || '{}';
    const result = JSON.parse(text);
    
    return {
      tags: result.tags || [],
      category: result.category || 'Other',
      summary: result.summary || '',
    };
  } catch (error) {
    console.error('Error generating AI tags:', error);
    return {
      tags: [],
      category: 'Other',
      summary: '',
    };
  }
}

// Tag color mapping
const TAG_COLORS: Record<string, string> = {
  'Medical': '#ef4444',
  'Research': '#3b82f6',
  'Clinical': '#22c55e',
  'Academic': '#8b5cf6',
  'Legal': '#6b7280',
  'Financial': '#f59e0b',
  'Technical': '#06b6d4',
  'Educational': '#ec4899',
  'Report': '#64748b',
  'Case Study': '#10b981',
  'Review': '#f97316',
  'Protocol': '#14b8a6',
  'Guidelines': '#6366f1',
  'Presentation': '#a855f7',
  'Data': '#0ea5e9',
  'Analysis': '#84cc16',
};

export function getTagColor(tagName: string): string {
  // Check if it's a known category
  if (TAG_COLORS[tagName]) {
    return TAG_COLORS[tagName];
  }
  
  // Generate consistent color from tag name
  let hash = 0;
  for (let i = 0; i < tagName.length; i++) {
    hash = tagName.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  const colors = [
    '#ef4444', '#f97316', '#f59e0b', '#84cc16', '#22c55e',
    '#10b981', '#14b8a6', '#06b6d4', '#0ea5e9', '#3b82f6',
    '#6366f1', '#8b5cf6', '#a855f7', '#d946ef', '#ec4899',
  ];
  
  return colors[Math.abs(hash) % colors.length] || '#6b7280';
}

// Suggest tags based on existing tags in the system
export async function suggestTags(
  existingTags: string[],
  content: string
): Promise<string[]> {
  try {
    const response = await genai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: `You are an AI that suggests relevant tags for documents.
          
User's existing tags: ${existingTags.slice(0, 20).join(', ')}

Document content (first 1000 chars):
${content.slice(0, 1000)}

Suggest 3-5 tags from the existing tags that might apply to this document.
Only suggest tags that are actually relevant to the content.
Respond with a JSON array only (no markdown): ["tag1", "tag2", "tag3"]`,
    });

    const text = response.text?.replace(/```json\n?|\n?```/g, '').trim() || '[]';
    const result = JSON.parse(text);
    return Array.isArray(result) ? result : (result.tags || []);
  } catch (error) {
    console.error('Error suggesting tags:', error);
    return [];
  }
}
