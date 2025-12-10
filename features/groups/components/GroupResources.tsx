// Group Resources Component - File upload, list, download, delete
'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Upload, 
  FolderOpen, 
  FileText, 
  Image as ImageIcon, 
  Video, 
  Music, 
  Download, 
  Trash2, 
  Search,
  Filter,
  Loader2,
  MoreVertical,
  Eye,
  X,
  File,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { GroupMedia } from '../types';
import { groupsApi } from '../api-config';
import { getBrowserSupabase } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface GroupResourcesProps {
  groupId: string;
  currentUserId: string;
  isAdmin: boolean;
  className?: string;
}

type FileTypeFilter = 'all' | 'image' | 'document' | 'audio' | 'video';

const FILE_TYPE_ICONS: Record<string, React.ReactNode> = {
  image: <ImageIcon className="w-5 h-5 text-green-500" />,
  document: <FileText className="w-5 h-5 text-blue-500" />,
  audio: <Music className="w-5 h-5 text-purple-500" />,
  video: <Video className="w-5 h-5 text-red-500" />,
};

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
}

export function GroupResources({
  groupId,
  currentUserId,
  isAdmin,
  className
}: GroupResourcesProps) {
  const [resources, setResources] = useState<GroupMedia[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<FileTypeFilter>('all');
  const [previewMedia, setPreviewMedia] = useState<GroupMedia | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<GroupMedia | null>(null);
  const [hasMore, setHasMore] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const supabase = getBrowserSupabase();

  // Fetch resources
  const fetchResources = useCallback(async (reset = true) => {
    setIsLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return;

      const params = new URLSearchParams();
      params.append('limit', '50');
      if (filterType !== 'all') {
        params.append('file_type', filterType);
      }

      const response = await fetch(groupsApi(`/api/groups/${groupId}/media?${params}`), {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });

      const data = await response.json();
      
      if (data.success) {
        setResources(data.media || []);
        setHasMore(data.has_more || false);
      }
    } catch (error) {
      console.error('Fetch resources error:', error);
      toast.error('Failed to load resources');
    } finally {
      setIsLoading(false);
    }
  }, [groupId, filterType, supabase.auth]);

  useEffect(() => {
    fetchResources();
  }, [fetchResources]);

  // Handle file upload
  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    setUploadProgress(0);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        toast.error('Not authenticated');
        return;
      }

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (!file) continue;
        
        const formData = new FormData();
        formData.append('file', file);

        const response = await fetch(groupsApi(`/api/groups/${groupId}/media`), {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`
          },
          body: formData
        });

        const data = await response.json();

        if (data.success && data.media) {
          setResources(prev => [data.media, ...prev]);
          toast.success(`Uploaded ${file.name}`);
        } else {
          toast.error(`Failed to upload ${file.name}: ${data.error || 'Unknown error'}`);
        }

        setUploadProgress(((i + 1) / files.length) * 100);
      }
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Upload failed');
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Handle download
  const handleDownload = async (media: GroupMedia) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return;

      const response = await fetch(groupsApi(`/api/groups/${groupId}/media/${media.id}/download`), {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });

      const data = await response.json();
      
      if (data.success && data.download_url) {
        // Create temporary link and trigger download
        const link = document.createElement('a');
        link.href = data.download_url;
        link.download = media.file_name;
        link.target = '_blank';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.success('Download started');
      } else {
        // Fallback to direct URL
        window.open(media.file_url, '_blank');
      }
    } catch (error) {
      console.error('Download error:', error);
      // Fallback to direct URL
      window.open(media.file_url, '_blank');
    }
  };

  // Handle delete
  const handleDelete = async (media: GroupMedia) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return;

      const response = await fetch(groupsApi(`/api/groups/${groupId}/media/${media.id}`), {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });

      const data = await response.json();
      
      if (data.success) {
        setResources(prev => prev.filter(r => r.id !== media.id));
        toast.success('File deleted');
      } else {
        toast.error(data.error || 'Failed to delete');
      }
    } catch (error) {
      console.error('Delete error:', error);
      toast.error('Failed to delete');
    } finally {
      setDeleteConfirm(null);
    }
  };

  // Filter resources by search
  const filteredResources = resources.filter(r => 
    r.file_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Group by file type for display
  const groupedResources = filteredResources.reduce((acc, resource) => {
    const type = resource.file_type || 'document';
    if (!acc[type]) acc[type] = [];
    acc[type].push(resource);
    return acc;
  }, {} as Record<string, GroupMedia[]>);

  return (
    <div className={cn("h-full flex flex-col", className)}>
      {/* Header */}
      <div className="p-3 sm:p-4 border-b space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Shared Resources</h2>
          <Button 
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            size="sm"
          >
            {isUploading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                {Math.round(uploadProgress)}%
              </>
            ) : (
              <>
                <Upload className="w-4 h-4 mr-2" />
                <span className="hidden sm:inline">Upload</span>
              </>
            )}
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="hidden"
            onChange={handleUpload}
            accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,audio/*,video/*"
          />
        </div>

        {/* Search and Filter */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search files..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={filterType} onValueChange={(v) => setFilterType(v as FileTypeFilter)}>
            <SelectTrigger className="w-[120px]">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="image">Images</SelectItem>
              <SelectItem value="document">Documents</SelectItem>
              <SelectItem value="audio">Audio</SelectItem>
              <SelectItem value="video">Video</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-3 sm:p-4">
        {isLoading ? (
          <div className="flex items-center justify-center h-40">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : filteredResources.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-12">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
              <FolderOpen className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="font-medium mb-2">No resources yet</h3>
            <p className="text-sm text-muted-foreground max-w-sm mb-4">
              Upload files to share with your group members.
            </p>
            <Button onClick={() => fileInputRef.current?.click()}>
              <Upload className="w-4 h-4 mr-2" />
              Upload Files
            </Button>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Images Grid */}
            {groupedResources.image && groupedResources.image.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
                  <ImageIcon className="w-4 h-4" />
                  Images ({groupedResources.image.length})
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                  {groupedResources.image.map((media) => (
                    <div 
                      key={media.id}
                      className="relative group aspect-square rounded-lg overflow-hidden bg-muted cursor-pointer"
                      onClick={() => setPreviewMedia(media)}
                    >
                      <img
                        src={media.thumbnail_url || media.file_url}
                        alt={media.file_name}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                        <Button size="icon" variant="secondary" className="h-8 w-8">
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button 
                          size="icon" 
                          variant="secondary" 
                          className="h-8 w-8"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDownload(media);
                          }}
                        >
                          <Download className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Other Files List */}
            {['document', 'audio', 'video'].map((type) => {
              const files = groupedResources[type];
              if (!files || files.length === 0) return null;
              
              return (
                <div key={type}>
                  <h3 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
                    {FILE_TYPE_ICONS[type]}
                    {type.charAt(0).toUpperCase() + type.slice(1)}s ({files.length})
                  </h3>
                  <div className="space-y-2">
                    {files.map((media) => (
                      <div 
                        key={media.id}
                        className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                      >
                        <div className="p-2 rounded-lg bg-muted">
                          {FILE_TYPE_ICONS[type] || <File className="w-5 h-5" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{media.file_name}</p>
                          <p className="text-xs text-muted-foreground">
                            {media.file_size ? formatFileSize(media.file_size) : 'Unknown size'}
                            {' • '}
                            {format(new Date(media.created_at), 'MMM d, yyyy')}
                          </p>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {type === 'video' || type === 'audio' ? (
                              <DropdownMenuItem onClick={() => setPreviewMedia(media)}>
                                <Eye className="w-4 h-4 mr-2" />
                                Preview
                              </DropdownMenuItem>
                            ) : null}
                            <DropdownMenuItem onClick={() => handleDownload(media)}>
                              <Download className="w-4 h-4 mr-2" />
                              Download
                            </DropdownMenuItem>
                            {(media.uploaded_by === currentUserId || isAdmin) && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem 
                                  onClick={() => setDeleteConfirm(media)}
                                  className="text-destructive"
                                >
                                  <Trash2 className="w-4 h-4 mr-2" />
                                  Delete
                                </DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Preview Modal */}
      <Dialog open={!!previewMedia} onOpenChange={() => setPreviewMedia(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="truncate pr-8">{previewMedia?.file_name}</DialogTitle>
          </DialogHeader>
          <div className="flex items-center justify-center min-h-[300px] bg-muted rounded-lg overflow-hidden">
            {previewMedia?.file_type === 'image' && (
              <img
                src={previewMedia.file_url}
                alt={previewMedia.file_name}
                className="max-w-full max-h-[70vh] object-contain"
              />
            )}
            {previewMedia?.file_type === 'video' && (
              <video
                src={previewMedia.file_url}
                controls
                className="max-w-full max-h-[70vh]"
              />
            )}
            {previewMedia?.file_type === 'audio' && (
              <audio src={previewMedia.file_url} controls className="w-full" />
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPreviewMedia(null)}>
              Close
            </Button>
            <Button onClick={() => previewMedia && handleDownload(previewMedia)}>
              <Download className="w-4 h-4 mr-2" />
              Download
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete File</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{deleteConfirm?.file_name}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={() => deleteConfirm && handleDelete(deleteConfirm)}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
