/**
 * File Service - Save and manage markdown research files
 * Now uses Supabase Storage for all file operations
 */

import { supabaseStorage } from '@/lib/storage/supabase-storage';

export class FileService {
  /**
   * Save markdown file to Supabase Storage
   */
  async saveMarkdownFile(
    userId: string,
    topic: string,
    markdown: string
  ): Promise<string> {
    const filename = supabaseStorage.generateFilename(topic, 'md');
    
    const { path } = await supabaseStorage.uploadMarkdownFile(
      userId,
      filename,
      markdown,
      'deep-research'
    );
    
    console.log(`✅ Saved markdown file to Supabase: ${path}`);
    
    // Return path for database
    return path;
  }

  /**
   * Read markdown file from Supabase Storage
   */
  async readMarkdownFile(filePath: string): Promise<string> {
    const content = await supabaseStorage.downloadFile(filePath);
    return content;
  }

  /**
   * Delete markdown file from Supabase Storage
   */
  async deleteMarkdownFile(filePath: string): Promise<void> {
    await supabaseStorage.deleteFile(filePath);
    console.log(`🗑️ Deleted file from Supabase: ${filePath}`);
  }

  /**
   * Convert markdown to plain text for display
   */
  markdownToPlainText(markdown: string): string {
    // Remove markdown syntax for user-friendly display
    let text = markdown;
    
    // Remove headers
    text = text.replace(/^#{1,6}\s+/gm, '');
    
    // Remove bold/italic
    text = text.replace(/\*\*(.+?)\*\*/g, '$1');
    text = text.replace(/\*(.+?)\*/g, '$1');
    
    // Remove links but keep text
    text = text.replace(/\[(.+?)\]\(.+?\)/g, '$1');
    
    // Remove code blocks
    text = text.replace(/```[\s\S]*?```/g, '');
    text = text.replace(/`(.+?)`/g, '$1');
    
    return text;
  }

  private sanitizeFilename(filename: string): string {
    return filename
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '')
      .substring(0, 50);
  }
}
