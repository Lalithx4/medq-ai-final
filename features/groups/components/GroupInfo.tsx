// Group Info Sidebar Component
'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  X, 
  Image as ImageIcon, 
  FileText, 
  Link as LinkIcon,
  Calendar,
  Edit2,
  Save,
  Users
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { format } from 'date-fns';
import { Group, GroupMedia, MemberRole } from '../types';
import { cn } from '@/lib/utils';

interface GroupInfoProps {
  group: Group;
  media: GroupMedia[];
  currentUserRole: MemberRole;
  onClose: () => void;
  onUpdateGroup: (data: { name?: string; description?: string }) => Promise<void>;
  className?: string;
}

export function GroupInfo({
  group,
  media,
  currentUserRole,
  onClose,
  onUpdateGroup,
  className
}: GroupInfoProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(group.name);
  const [editDescription, setEditDescription] = useState(group.description || '');
  const [isSaving, setIsSaving] = useState(false);

  const isAdmin = currentUserRole === 'owner' || currentUserRole === 'admin';

  // Filter media by type
  const images = media.filter(m => m.file_type === 'image');
  const files = media.filter(m => m.file_type === 'document');
  const links: GroupMedia[] = []; // Links are handled differently

  const handleSave = async () => {
    if (!editName.trim()) return;
    
    setIsSaving(true);
    try {
      await onUpdateGroup({
        name: editName.trim(),
        description: editDescription.trim() || undefined
      });
      setIsEditing(false);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancelEdit = () => {
    setEditName(group.name);
    setEditDescription(group.description || '');
    setIsEditing(false);
  };

  return (
    <motion.div
      initial={{ x: '100%' }}
      animate={{ x: 0 }}
      exit={{ x: '100%' }}
      transition={{ type: 'spring', damping: 25 }}
      className={cn(
        "fixed right-0 top-0 bottom-0 w-full max-w-sm bg-background border-l shadow-xl z-50 flex flex-col",
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b">
        <h2 className="font-semibold">Group Info</h2>
        <Button size="icon" variant="ghost" onClick={onClose}>
          <X className="w-5 h-5" />
        </Button>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-6">
          {/* Group Avatar & Name */}
          <div className="flex flex-col items-center text-center">
            <Avatar className="h-24 w-24 mb-4">
              <AvatarImage src={group.avatar_url || ''} />
              <AvatarFallback className="text-3xl bg-primary/10 text-primary">
                {group.name.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>

            {isEditing ? (
              <div className="w-full space-y-3">
                <Input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder="Group name"
                  className="text-center"
                />
                <Textarea
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  placeholder="Group description (optional)"
                  rows={2}
                  className="resize-none"
                />
                <div className="flex gap-2 justify-center">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCancelEdit}
                    disabled={isSaving}
                  >
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleSave}
                    disabled={!editName.trim() || isSaving}
                  >
                    <Save className="w-4 h-4 mr-1" />
                    Save
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-2">
                  <h3 className="text-xl font-semibold">{group.name}</h3>
                  {isAdmin && (
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-6 w-6"
                      onClick={() => setIsEditing(true)}
                    >
                      <Edit2 className="w-3 h-3" />
                    </Button>
                  )}
                </div>
                {group.description && (
                  <p className="text-sm text-muted-foreground mt-1">
                    {group.description}
                  </p>
                )}
              </>
            )}
          </div>

          {/* Group Stats */}
          <div className="flex justify-center gap-8 py-4 border-y">
            <div className="text-center">
              <Users className="w-5 h-5 mx-auto text-muted-foreground mb-1" />
              <p className="text-sm font-medium">{group.member_count || 0}</p>
              <p className="text-xs text-muted-foreground">Members</p>
            </div>
            <div className="text-center">
              <ImageIcon className="w-5 h-5 mx-auto text-muted-foreground mb-1" />
              <p className="text-sm font-medium">{images.length}</p>
              <p className="text-xs text-muted-foreground">Media</p>
            </div>
            <div className="text-center">
              <FileText className="w-5 h-5 mx-auto text-muted-foreground mb-1" />
              <p className="text-sm font-medium">{files.length}</p>
              <p className="text-xs text-muted-foreground">Files</p>
            </div>
          </div>

          {/* Created Date */}
          <div className="flex items-center gap-3 text-sm">
            <Calendar className="w-4 h-4 text-muted-foreground" />
            <span className="text-muted-foreground">Created</span>
            <span>{format(new Date(group.created_at), 'MMMM d, yyyy')}</span>
          </div>

          {/* Media Tabs */}
          <Tabs defaultValue="media" className="w-full">
            <TabsList className="w-full">
              <TabsTrigger value="media" className="flex-1">Media</TabsTrigger>
              <TabsTrigger value="files" className="flex-1">Files</TabsTrigger>
              <TabsTrigger value="links" className="flex-1">Links</TabsTrigger>
            </TabsList>

            <TabsContent value="media" className="mt-4">
              {images.length > 0 ? (
                <div className="grid grid-cols-3 gap-1">
                  {images.map((item) => (
                    <a
                      key={item.id}
                      href={item.file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="aspect-square rounded overflow-hidden hover:opacity-80 transition-opacity"
                    >
                      <img
                        src={item.file_url}
                        alt={item.file_name}
                        className="w-full h-full object-cover"
                      />
                    </a>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <ImageIcon className="w-10 h-10 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No media shared</p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="files" className="mt-4">
              {files.length > 0 ? (
                <div className="space-y-2">
                  {files.map((item) => (
                    <a
                      key={item.id}
                      href={item.file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted transition-colors"
                    >
                      <div className="w-10 h-10 rounded bg-primary/10 flex items-center justify-center">
                        <FileText className="w-5 h-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {item.file_name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {item.file_size ? `${Math.round(item.file_size / 1024)} KB` : 'Unknown size'}
                        </p>
                      </div>
                    </a>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="w-10 h-10 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No files shared</p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="links" className="mt-4">
              {links.length > 0 ? (
                <div className="space-y-2">
                  {links.map((item) => (
                    <a
                      key={item.id}
                      href={item.file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted transition-colors"
                    >
                      <div className="w-10 h-10 rounded bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                        <LinkIcon className="w-5 h-5 text-blue-500" />
                      </div>
                      <p className="text-sm text-blue-500 truncate flex-1">
                        {item.file_url}
                      </p>
                    </a>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <LinkIcon className="w-10 h-10 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No links shared</p>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </ScrollArea>
    </motion.div>
  );
}
