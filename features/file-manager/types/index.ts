// File Manager Types

// Storage provider type
export type StorageProvider = 'wasabi' | 'uploadthing' | 'supabase';

export interface UserFile {
  id: string;
  userId: string;
  collectionId?: string;
  
  // File info
  filename: string;
  originalName: string;
  fileUrl: string;
  fileKey?: string; // Storage key/path (e.g., users/{userId}/files/...)
  storageProvider?: StorageProvider; // wasabi, uploadthing, supabase
  fileType: FileType;
  mimeType?: string;
  fileSize: number;
  
  // Processing
  status: FileStatus;
  processingError?: string;
  
  // Content
  extractedText?: string;
  pageCount?: number;
  wordCount?: number;
  
  // AI metadata
  aiSummary?: string;
  aiCategory?: string;
  
  // User metadata
  isFavorite: boolean;
  isGenerated: boolean;
  sourceFeature?: SourceFeature;
  
  // Timestamps
  lastAccessedAt?: string;
  createdAt: string;
  updatedAt: string;
  
  // Relations (when joined)
  tags?: FileTag[];
  collection?: FileCollection;
}

export interface FileCollection {
  id: string;
  userId: string;
  name: string;
  description?: string;
  color: string;
  icon: string;
  isSmart: boolean;
  smartFilter?: SmartFilterCriteria;
  fileCount: number;
  createdAt: string;
  updatedAt: string;
  // Sharing fields
  isShared?: boolean;
  shareLink?: string;
  shareLinkEnabled?: boolean;
  shareLinkAccess?: 'public' | 'login';
  shareLinkRole?: 'viewer' | 'editor';
  ownerEmail?: string;
  myRole?: 'owner' | 'editor' | 'viewer';
  members?: CollectionMember[];
}

export interface CollectionMember {
  id: string;
  collectionId: string;
  userId?: string;
  email: string;
  role: 'owner' | 'editor' | 'viewer';
  status: 'pending' | 'accepted' | 'rejected';
  invitedBy?: string;
  invitedAt?: string;
  acceptedAt?: string;
  isOwner?: boolean;
}

export interface FileTag {
  id: string;
  fileId: string;
  userId: string;
  tagName: string;
  tagType: 'manual' | 'ai' | 'system';
  confidence: number;
  color?: string;
  createdAt: string;
}

export interface FileChunk {
  id: string;
  fileId: string;
  userId: string;
  chunkIndex: number;
  chunkText: string;
  pageNumber?: number;
  tokenCount?: number;
  embedding?: number[];
  createdAt: string;
}

export interface FileUsage {
  id: string;
  fileId: string;
  userId: string;
  feature: string;
  referenceId?: string;
  referenceTitle?: string;
  usedAt: string;
}

// Enums
export type FileType = 
  | 'pdf' 
  | 'doc' 
  | 'docx' 
  | 'image' 
  | 'png' 
  | 'jpg' 
  | 'jpeg' 
  | 'gif' 
  | 'webp'
  | 'txt'
  | 'md'
  | 'csv'
  | 'xlsx'
  | 'pptx'
  | 'other';

export type FileStatus = 
  | 'uploading' 
  | 'processing' 
  | 'indexed' 
  | 'ready' 
  | 'error';

export type SourceFeature = 
  | 'deep-research' 
  | 'presentation' 
  | 'research-paper' 
  | 'editor'
  | 'irb-draft'
  | 'poster'
  | 'literature-review'
  | 'uploaded';

export type FileViewMode = 'grid' | 'list' | 'masonry';

export type FileSortOption = 
  | 'newest' 
  | 'oldest' 
  | 'name-asc' 
  | 'name-desc' 
  | 'size-asc' 
  | 'size-desc'
  | 'recently-used';

export type FileFilterOption = 
  | 'all' 
  | 'uploaded' 
  | 'generated' 
  | 'favorites' 
  | 'pdf' 
  | 'doc' 
  | 'image';

// Smart collection filter
export interface SmartFilterCriteria {
  fileTypes?: FileType[];
  tags?: string[];
  dateRange?: {
    start?: string;
    end?: string;
  };
  isGenerated?: boolean;
  sourceFeature?: SourceFeature;
}

// Search result
export interface FileSearchResult {
  file: UserFile;
  matchedChunk?: string;
  similarity?: number;
  matchType: 'filename' | 'content' | 'semantic' | 'tag';
}

// Upload progress
export interface UploadProgress {
  fileId: string;
  filename: string;
  progress: number;
  status: 'uploading' | 'processing' | 'complete' | 'error';
  error?: string;
}

// File stats
export interface FileStats {
  totalFiles: number;
  totalSize: number;
  uploadedCount: number;
  generatedCount: number;
  favoriteCount: number;
  filesByType: Record<FileType, number>;
  recentlyUsed: number;
}

// API Response types
export interface FileListResponse {
  files: UserFile[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

export interface FileUploadResponse {
  success: boolean;
  file?: UserFile;
  error?: string;
}

export interface FileSearchResponse {
  results: FileSearchResult[];
  total: number;
  query: string;
  searchType: 'keyword' | 'semantic' | 'hybrid';
}

// Component props
export interface FileCardProps {
  file: UserFile;
  isSelected?: boolean;
  onSelect?: (file: UserFile) => void;
  onOpen?: (file: UserFile) => void;
  onDelete?: (file: UserFile) => void;
  onFavorite?: (file: UserFile) => void;
  onAddToCollection?: (file: UserFile) => void;
  showActions?: boolean;
}

export interface FileGalleryProps {
  files: UserFile[];
  viewMode: FileViewMode;
  isLoading?: boolean;
  selectedFiles?: string[];
  onFileSelect?: (file: UserFile) => void;
  onFileOpen?: (file: UserFile) => void;
  onFileDelete?: (file: UserFile) => void;
}

export interface FileUploaderProps {
  onUploadComplete?: (files: UserFile[]) => void;
  onUploadError?: (error: string) => void;
  maxFiles?: number;
  maxSize?: number; // in MB
  acceptedTypes?: string[];
  collectionId?: string;
}

export interface FileSearchProps {
  onSearch: (query: string, type: 'keyword' | 'semantic') => void;
  onClear: () => void;
  isSearching?: boolean;
  placeholder?: string;
}

export interface FilePreviewProps {
  file: UserFile;
  isOpen: boolean;
  onClose: () => void;
  onInsert?: (file: UserFile) => void;
  onDelete?: (file: UserFile) => void;
}

export interface FilePickerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (files: UserFile[]) => void;
  multiple?: boolean;
  acceptedTypes?: FileType[];
  title?: string;
}

export interface CollectionManagerProps {
  collections: FileCollection[];
  onCreateCollection: (name: string, color: string) => void;
  onDeleteCollection: (id: string) => void;
  onSelectCollection: (collection: FileCollection | null) => void;
  selectedCollectionId?: string;
}
