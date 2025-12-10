import { create } from 'zustand';
import { 
  UserFile, 
  FileCollection, 
  FileViewMode, 
  FileSortOption, 
  FileFilterOption,
  UploadProgress,
  FileStats 
} from '../types';

interface FileManagerState {
  // Files
  files: UserFile[];
  selectedFiles: string[];
  activeFile: UserFile | null;
  
  // Collections
  collections: FileCollection[];
  activeCollection: FileCollection | null;
  
  // View settings
  viewMode: FileViewMode;
  sortOption: FileSortOption;
  filterOption: FileFilterOption;
  
  // Search
  searchQuery: string;
  searchResults: UserFile[];
  isSearching: boolean;
  
  // Upload
  uploadQueue: UploadProgress[];
  isUploading: boolean;
  
  // UI state
  isLoading: boolean;
  isPreviewOpen: boolean;
  isPickerOpen: boolean;
  showGeneratedContent: boolean;
  showUploadedContent: boolean;
  
  // Stats
  stats: FileStats | null;
  
  // Actions - Files
  setFiles: (files: UserFile[]) => void;
  addFile: (file: UserFile) => void;
  updateFile: (id: string, updates: Partial<UserFile>) => void;
  removeFile: (id: string) => void;
  selectFile: (id: string) => void;
  deselectFile: (id: string) => void;
  clearSelection: () => void;
  setActiveFile: (file: UserFile | null) => void;
  toggleFavorite: (id: string) => void;
  
  // Actions - Collections
  setCollections: (collections: FileCollection[]) => void;
  addCollection: (collection: FileCollection) => void;
  updateCollection: (id: string, updates: Partial<FileCollection>) => void;
  removeCollection: (id: string) => void;
  setActiveCollection: (collection: FileCollection | null) => void;
  
  // Actions - View
  setViewMode: (mode: FileViewMode) => void;
  setSortOption: (option: FileSortOption) => void;
  setFilterOption: (option: FileFilterOption) => void;
  
  // Actions - Search
  setSearchQuery: (query: string) => void;
  setSearchResults: (results: UserFile[]) => void;
  setIsSearching: (isSearching: boolean) => void;
  clearSearch: () => void;
  
  // Actions - Upload
  addToUploadQueue: (upload: UploadProgress) => void;
  updateUploadProgress: (fileId: string, progress: Partial<UploadProgress>) => void;
  removeFromUploadQueue: (fileId: string) => void;
  clearUploadQueue: () => void;
  setIsUploading: (isUploading: boolean) => void;
  
  // Actions - UI
  setIsLoading: (isLoading: boolean) => void;
  setIsPreviewOpen: (isOpen: boolean) => void;
  setIsPickerOpen: (isOpen: boolean) => void;
  setShowGeneratedContent: (show: boolean) => void;
  setShowUploadedContent: (show: boolean) => void;
  
  // Actions - Stats
  setStats: (stats: FileStats) => void;
  
  // Computed
  getFilteredFiles: () => UserFile[];
  getSortedFiles: (files: UserFile[]) => UserFile[];
}

export const useFileManagerStore = create<FileManagerState>((set, get) => ({
  // Initial state
  files: [],
  selectedFiles: [],
  activeFile: null,
  collections: [],
  activeCollection: null,
  viewMode: 'grid',
  sortOption: 'newest',
  filterOption: 'all',
  searchQuery: '',
  searchResults: [],
  isSearching: false,
  uploadQueue: [],
  isUploading: false,
  isLoading: false,
  isPreviewOpen: false,
  isPickerOpen: false,
  showGeneratedContent: true,
  showUploadedContent: true,
  stats: null,

  // File actions
  setFiles: (files) => set({ files }),
  
  addFile: (file) => set((state) => ({ 
    files: [file, ...state.files] 
  })),
  
  updateFile: (id, updates) => set((state) => ({
    files: state.files.map((f) => 
      f.id === id ? { ...f, ...updates } : f
    )
  })),
  
  removeFile: (id) => set((state) => ({
    files: state.files.filter((f) => f.id !== id),
    selectedFiles: state.selectedFiles.filter((fId) => fId !== id)
  })),
  
  selectFile: (id) => set((state) => ({
    selectedFiles: [...state.selectedFiles, id]
  })),
  
  deselectFile: (id) => set((state) => ({
    selectedFiles: state.selectedFiles.filter((fId) => fId !== id)
  })),
  
  clearSelection: () => set({ selectedFiles: [] }),
  
  setActiveFile: (file) => set({ activeFile: file }),
  
  toggleFavorite: (id) => set((state) => ({
    files: state.files.map((f) =>
      f.id === id ? { ...f, isFavorite: !f.isFavorite } : f
    )
  })),

  // Collection actions
  setCollections: (collections) => set({ collections }),
  
  addCollection: (collection) => set((state) => ({
    collections: [...state.collections, collection]
  })),
  
  updateCollection: (id, updates) => set((state) => ({
    collections: state.collections.map((c) =>
      c.id === id ? { ...c, ...updates } : c
    )
  })),
  
  removeCollection: (id) => set((state) => ({
    collections: state.collections.filter((c) => c.id !== id)
  })),
  
  setActiveCollection: (collection) => set({ activeCollection: collection }),

  // View actions
  setViewMode: (mode) => set({ viewMode: mode }),
  setSortOption: (option) => set({ sortOption: option }),
  setFilterOption: (option) => set({ filterOption: option }),

  // Search actions
  setSearchQuery: (query) => set({ searchQuery: query }),
  setSearchResults: (results) => set({ searchResults: results }),
  setIsSearching: (isSearching) => set({ isSearching }),
  clearSearch: () => set({ searchQuery: '', searchResults: [], isSearching: false }),

  // Upload actions
  addToUploadQueue: (upload) => set((state) => ({
    uploadQueue: [...state.uploadQueue, upload]
  })),
  
  updateUploadProgress: (fileId, progress) => set((state) => ({
    uploadQueue: state.uploadQueue.map((u) =>
      u.fileId === fileId ? { ...u, ...progress } : u
    )
  })),
  
  removeFromUploadQueue: (fileId) => set((state) => ({
    uploadQueue: state.uploadQueue.filter((u) => u.fileId !== fileId)
  })),
  
  clearUploadQueue: () => set({ uploadQueue: [] }),
  setIsUploading: (isUploading) => set({ isUploading }),

  // UI actions
  setIsLoading: (isLoading) => set({ isLoading }),
  setIsPreviewOpen: (isOpen) => set({ isPreviewOpen: isOpen }),
  setIsPickerOpen: (isOpen) => set({ isPickerOpen: isOpen }),
  setShowGeneratedContent: (show) => set({ showGeneratedContent: show }),
  setShowUploadedContent: (show) => set({ showUploadedContent: show }),

  // Stats actions
  setStats: (stats) => set({ stats }),

  // Computed
  getFilteredFiles: () => {
    const state = get();
    let filtered = [...state.files];
    
    // Apply collection filter
    if (state.activeCollection) {
      filtered = filtered.filter((f) => f.collectionId === state.activeCollection?.id);
    }
    
    // Apply content type filter
    if (!state.showGeneratedContent) {
      filtered = filtered.filter((f) => !f.isGenerated);
    }
    if (!state.showUploadedContent) {
      filtered = filtered.filter((f) => f.isGenerated);
    }
    
    // Apply filter option
    switch (state.filterOption) {
      case 'uploaded':
        filtered = filtered.filter((f) => !f.isGenerated);
        break;
      case 'generated':
        filtered = filtered.filter((f) => f.isGenerated);
        break;
      case 'favorites':
        filtered = filtered.filter((f) => f.isFavorite);
        break;
      case 'pdf':
        filtered = filtered.filter((f) => f.fileType === 'pdf');
        break;
      case 'doc':
        filtered = filtered.filter((f) => ['doc', 'docx'].includes(f.fileType));
        break;
      case 'image':
        filtered = filtered.filter((f) => 
          ['image', 'png', 'jpg', 'jpeg', 'gif', 'webp'].includes(f.fileType)
        );
        break;
    }
    
    return filtered;
  },
  
  getSortedFiles: (files) => {
    const state = get();
    const sorted = [...files];
    
    switch (state.sortOption) {
      case 'newest':
        sorted.sort((a, b) => 
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        break;
      case 'oldest':
        sorted.sort((a, b) => 
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        );
        break;
      case 'name-asc':
        sorted.sort((a, b) => a.filename.localeCompare(b.filename));
        break;
      case 'name-desc':
        sorted.sort((a, b) => b.filename.localeCompare(a.filename));
        break;
      case 'size-asc':
        sorted.sort((a, b) => a.fileSize - b.fileSize);
        break;
      case 'size-desc':
        sorted.sort((a, b) => b.fileSize - a.fileSize);
        break;
      case 'recently-used':
        sorted.sort((a, b) => {
          const aTime = a.lastAccessedAt ? new Date(a.lastAccessedAt).getTime() : 0;
          const bTime = b.lastAccessedAt ? new Date(b.lastAccessedAt).getTime() : 0;
          return bTime - aTime;
        });
        break;
    }
    
    return sorted;
  }
}));
