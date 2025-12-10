import { FileType, UserFile } from '../types';

// Get file type from filename or mime type
export function getFileType(filename: string, mimeType?: string): FileType {
  const ext = filename.split('.').pop()?.toLowerCase() || '';
  
  // Check by extension first
  const extensionMap: Record<string, FileType> = {
    'pdf': 'pdf',
    'doc': 'doc',
    'docx': 'docx',
    'txt': 'txt',
    'md': 'md',
    'csv': 'csv',
    'xlsx': 'xlsx',
    'xls': 'xlsx',
    'pptx': 'pptx',
    'ppt': 'pptx',
    'png': 'png',
    'jpg': 'jpg',
    'jpeg': 'jpeg',
    'gif': 'gif',
    'webp': 'webp',
  };
  
  if (extensionMap[ext]) {
    return extensionMap[ext];
  }
  
  // Fall back to mime type
  if (mimeType) {
    if (mimeType.startsWith('image/')) return 'image';
    if (mimeType === 'application/pdf') return 'pdf';
    if (mimeType.includes('word')) return 'docx';
    if (mimeType.includes('spreadsheet') || mimeType.includes('excel')) return 'xlsx';
    if (mimeType.includes('presentation') || mimeType.includes('powerpoint')) return 'pptx';
  }
  
  return 'other';
}

// Format file size for display
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const k = 1024;
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${units[i]}`;
}

// Get file icon based on type
export function getFileIcon(fileType: FileType): string {
  const iconMap: Record<FileType, string> = {
    'pdf': '📄',
    'doc': '📝',
    'docx': '📝',
    'txt': '📃',
    'md': '📋',
    'csv': '📊',
    'xlsx': '📊',
    'pptx': '📽️',
    'image': '🖼️',
    'png': '🖼️',
    'jpg': '🖼️',
    'jpeg': '🖼️',
    'gif': '🎞️',
    'webp': '🖼️',
    'other': '📎',
  };
  
  return iconMap[fileType] || '📎';
}

// Get file color based on type (for UI)
export function getFileColor(fileType: FileType): string {
  const colorMap: Record<FileType, string> = {
    'pdf': '#ef4444',      // red
    'doc': '#3b82f6',      // blue
    'docx': '#3b82f6',     // blue
    'txt': '#6b7280',      // gray
    'md': '#8b5cf6',       // purple
    'csv': '#22c55e',      // green
    'xlsx': '#22c55e',     // green
    'pptx': '#f97316',     // orange
    'image': '#ec4899',    // pink
    'png': '#ec4899',      // pink
    'jpg': '#ec4899',      // pink
    'jpeg': '#ec4899',     // pink
    'gif': '#a855f7',      // violet
    'webp': '#ec4899',     // pink
    'other': '#6b7280',    // gray
  };
  
  return colorMap[fileType] || '#6b7280';
}

// Check if file type is previewable
export function isPreviewable(fileType: FileType): boolean {
  const previewable: FileType[] = [
    'pdf', 'image', 'png', 'jpg', 'jpeg', 'gif', 'webp', 'txt', 'md'
  ];
  return previewable.includes(fileType);
}

// Check if file is an image
export function isImageFile(fileType: FileType): boolean {
  const imageTypes: FileType[] = ['image', 'png', 'jpg', 'jpeg', 'gif', 'webp'];
  return imageTypes.includes(fileType);
}

// Check if file is a document
export function isDocumentFile(fileType: FileType): boolean {
  const docTypes: FileType[] = ['pdf', 'doc', 'docx', 'txt', 'md'];
  return docTypes.includes(fileType);
}

// Generate thumbnail URL for images
export function getThumbnailUrl(file: UserFile, size: 'sm' | 'md' | 'lg' = 'md'): string {
  if (!isImageFile(file.fileType)) {
    return '';
  }
  
  // For uploadthing URLs, we can append size params
  // This is a placeholder - adjust based on your image service
  return file.fileUrl;
}

// Validate file for upload
export function validateFile(
  file: File, 
  options: {
    maxSize?: number; // in MB
    acceptedTypes?: string[];
  } = {}
): { valid: boolean; error?: string } {
  const { maxSize = 50, acceptedTypes } = options;
  
  // Check size
  const maxBytes = maxSize * 1024 * 1024;
  if (file.size > maxBytes) {
    return { 
      valid: false, 
      error: `File size exceeds ${maxSize}MB limit` 
    };
  }
  
  // Check type
  if (acceptedTypes && acceptedTypes.length > 0) {
    const fileExt = file.name.split('.').pop()?.toLowerCase();
    const isAccepted = acceptedTypes.some(type => {
      if (type.startsWith('.')) {
        return `.${fileExt}` === type.toLowerCase();
      }
      if (type.includes('/')) {
        return file.type.match(new RegExp(type.replace('*', '.*')));
      }
      return fileExt === type.toLowerCase();
    });
    
    if (!isAccepted) {
      return {
        valid: false,
        error: `File type not accepted. Allowed: ${acceptedTypes.join(', ')}`
      };
    }
  }
  
  return { valid: true };
}

// Get relative time string
export function getRelativeTime(date: string | Date): string {
  const now = new Date();
  const then = new Date(date);
  const diffMs = now.getTime() - then.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);
  const diffWeeks = Math.floor(diffDays / 7);
  const diffMonths = Math.floor(diffDays / 30);
  
  if (diffSecs < 60) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  if (diffWeeks < 4) return `${diffWeeks}w ago`;
  if (diffMonths < 12) return `${diffMonths}mo ago`;
  
  return then.toLocaleDateString();
}

// Get source feature display name
export function getSourceFeatureName(source?: string): string {
  const names: Record<string, string> = {
    'deep-research': 'Deep Research',
    'presentation': 'Presentation',
    'research-paper': 'Research Paper',
    'editor': 'Document Editor',
    'irb-draft': 'IRB Protocol',
    'poster': 'E-Poster',
    'literature-review': 'Literature Review',
    'uploaded': 'Uploaded',
  };
  
  return names[source || 'uploaded'] || 'Unknown';
}

// Generate unique filename
export function generateUniqueFilename(originalName: string): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  const ext = originalName.split('.').pop();
  const name = originalName.replace(/\.[^/.]+$/, '').replace(/[^a-zA-Z0-9]/g, '_');
  
  return `${name}_${timestamp}_${random}.${ext}`;
}

// Truncate filename for display
export function truncateFilename(filename: string, maxLength: number = 30): string {
  if (filename.length <= maxLength) return filename;
  
  const ext = filename.split('.').pop() || '';
  const name = filename.slice(0, -(ext.length + 1));
  const truncatedName = name.slice(0, maxLength - ext.length - 4) + '...';
  
  return `${truncatedName}.${ext}`;
}
