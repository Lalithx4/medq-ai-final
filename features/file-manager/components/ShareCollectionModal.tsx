"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from "@/components/ui/tooltip";
import { toast } from "sonner";
import {
  Users,
  Link,
  Copy,
  Check,
  X,
  Crown,
  Eye,
  Edit3,
  Trash2,
  Globe,
  Lock,
  RefreshCw,
  UserPlus,
  Mail,
  Loader2,
} from "lucide-react";
import { FileCollection, CollectionMember } from "../types";

interface ShareCollectionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  collection: FileCollection | null;
  onMembersUpdated?: () => void;
}

export function ShareCollectionModal({
  open,
  onOpenChange,
  collection,
  onMembersUpdated,
}: ShareCollectionModalProps) {
  const [members, setMembers] = useState<CollectionMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"viewer" | "editor">("viewer");
  const [inviting, setInviting] = useState(false);
  const [copied, setCopied] = useState(false);
  
  // Share link settings
  const [shareLink, setShareLink] = useState("");
  const [shareLinkEnabled, setShareLinkEnabled] = useState(false);
  const [shareLinkAccess, setShareLinkAccess] = useState<"public" | "login">("login");
  const [shareLinkRole, setShareLinkRole] = useState<"viewer" | "editor">("viewer");
  const [updatingLink, setUpdatingLink] = useState(false);

  useEffect(() => {
    if (open && collection) {
      fetchMembers();
      fetchShareLinkSettings();
    }
  }, [open, collection]);

  const fetchMembers = async () => {
    if (!collection) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/file-manager/collections/members?collectionId=${collection.id}`);
      const data = await res.json();
      if (res.ok) {
        setMembers(data.members || []);
      }
    } catch (error) {
      console.error("Failed to fetch members:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchShareLinkSettings = async () => {
    if (!collection) return;
    try {
      const res = await fetch(`/api/file-manager/collections/share-link?collectionId=${collection.id}`);
      const data = await res.json();
      if (res.ok) {
        setShareLink(data.shareLink || "");
        setShareLinkEnabled(data.enabled || false);
        setShareLinkAccess(data.access || "login");
        setShareLinkRole(data.role || "viewer");
      }
    } catch (error) {
      console.error("Failed to fetch share link settings:", error);
    }
  };

  const inviteMember = async () => {
    if (!collection || !email.trim()) return;
    
    // Basic email validation
    if (!email.includes("@") || !email.includes(".")) {
      toast.error("Please enter a valid email address");
      return;
    }

    setInviting(true);
    try {
      const res = await fetch("/api/file-manager/collections/members", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          collectionId: collection.id,
          email: email.trim(),
          role,
        }),
      });
      
      const data = await res.json();
      
      if (res.ok) {
        toast.success(data.message || "Member added successfully");
        setEmail("");
        fetchMembers();
        onMembersUpdated?.();
      } else {
        toast.error(data.error || "Failed to invite member");
      }
    } catch (error) {
      toast.error("Failed to invite member");
    } finally {
      setInviting(false);
    }
  };

  const removeMember = async (memberId: string) => {
    if (!collection) return;
    
    try {
      const res = await fetch(
        `/api/file-manager/collections/members?memberId=${memberId}&collectionId=${collection.id}`,
        { method: "DELETE" }
      );
      
      if (res.ok) {
        toast.success("Member removed");
        fetchMembers();
        onMembersUpdated?.();
      } else {
        toast.error("Failed to remove member");
      }
    } catch (error) {
      toast.error("Failed to remove member");
    }
  };

  const updateMemberRole = async (memberId: string, newRole: "viewer" | "editor") => {
    try {
      const res = await fetch("/api/file-manager/collections/members", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memberId, role: newRole }),
      });
      
      if (res.ok) {
        toast.success("Role updated");
        fetchMembers();
      } else {
        toast.error("Failed to update role");
      }
    } catch (error) {
      toast.error("Failed to update role");
    }
  };

  const updateShareLinkSettings = async (updates: {
    enabled?: boolean;
    access?: "public" | "login";
    role?: "viewer" | "editor";
    regenerate?: boolean;
  }) => {
    if (!collection) return;
    
    setUpdatingLink(true);
    try {
      const res = await fetch("/api/file-manager/collections/share-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          collectionId: collection.id,
          ...updates,
        }),
      });
      
      const data = await res.json();
      
      if (res.ok) {
        setShareLink(data.shareLink);
        setShareLinkEnabled(data.enabled);
        setShareLinkAccess(data.access);
        setShareLinkRole(data.role);
        if (updates.regenerate) {
          toast.success("New link generated");
        }
      } else {
        toast.error("Failed to update share settings");
      }
    } catch (error) {
      toast.error("Failed to update share settings");
    } finally {
      setUpdatingLink(false);
    }
  };

  const copyShareLink = () => {
    const fullLink = `${window.location.origin}/shared/${shareLink}`;
    navigator.clipboard.writeText(fullLink);
    setCopied(true);
    toast.success("Link copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  };

  const getRoleIcon = (memberRole: string) => {
    switch (memberRole) {
      case "owner":
        return <Crown className="h-3.5 w-3.5 text-amber-500" />;
      case "editor":
        return <Edit3 className="h-3.5 w-3.5 text-blue-500" />;
      default:
        return <Eye className="h-3.5 w-3.5 text-muted-foreground" />;
    }
  };

  const getRoleBadgeColor = (memberRole: string) => {
    switch (memberRole) {
      case "owner":
        return "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400";
      case "editor":
        return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  if (!collection) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div
              className="h-8 w-8 rounded-lg flex items-center justify-center text-white"
              style={{ backgroundColor: collection.color }}
            >
              <Users className="h-4 w-4" />
            </div>
            Share "{collection.name}"
          </DialogTitle>
          <DialogDescription>
            Invite members or create a share link for this collection
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] pr-4">
          <div className="space-y-6">
            {/* Invite by Email */}
            <div className="space-y-3">
              <Label className="text-sm font-medium flex items-center gap-2">
                <UserPlus className="h-4 w-4" />
                Invite by Email
              </Label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="email@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-9"
                    onKeyDown={(e) => e.key === "Enter" && inviteMember()}
                  />
                </div>
                <Select value={role} onValueChange={(v) => setRole(v as "viewer" | "editor")}>
                  <SelectTrigger className="w-[110px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="viewer">
                      <div className="flex items-center gap-2">
                        <Eye className="h-3.5 w-3.5" />
                        Viewer
                      </div>
                    </SelectItem>
                    <SelectItem value="editor">
                      <div className="flex items-center gap-2">
                        <Edit3 className="h-3.5 w-3.5" />
                        Editor
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
                <Button onClick={inviteMember} disabled={inviting || !email.trim()}>
                  {inviting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    "Invite"
                  )}
                </Button>
              </div>
            </div>

            <Separator />

            {/* Members List */}
            <div className="space-y-3">
              <Label className="text-sm font-medium flex items-center gap-2">
                <Users className="h-4 w-4" />
                Members ({members.length})
              </Label>
              <div className="space-y-2">
                {loading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  </div>
                ) : members.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No members yet. Invite someone to collaborate!
                  </p>
                ) : (
                  <AnimatePresence mode="popLayout">
                    {members.map((member) => (
                      <motion.div
                        key={member.id}
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="h-8 w-8 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center">
                            <span className="text-xs font-medium text-primary">
                              {member.email?.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate">
                              {member.email}
                            </p>
                            {member.status === "pending" && (
                              <p className="text-xs text-muted-foreground">
                                Pending invitation
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge
                            variant="secondary"
                            className={`text-xs ${getRoleBadgeColor(member.role)}`}
                          >
                            {getRoleIcon(member.role)}
                            <span className="ml-1 capitalize">{member.role}</span>
                          </Badge>
                          {member.role !== "owner" && (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7 text-muted-foreground hover:text-destructive"
                                    onClick={() => removeMember(member.id)}
                                  >
                                    <X className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Remove member</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          )}
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                )}
              </div>
            </div>

            <Separator />

            {/* Share Link */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium flex items-center gap-2">
                  <Link className="h-4 w-4" />
                  Share Link
                </Label>
                <Switch
                  checked={shareLinkEnabled}
                  onCheckedChange={(enabled) => updateShareLinkSettings({ enabled })}
                  disabled={updatingLink}
                />
              </div>

              <AnimatePresence>
                {shareLinkEnabled && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="space-y-4"
                  >
                    {/* Link URL */}
                    <div className="flex gap-2">
                      <div className="flex-1 relative">
                        <Input
                          readOnly
                          value={`${typeof window !== "undefined" ? window.location.origin : ""}/shared/${shareLink}`}
                          className="pr-10 text-sm font-mono bg-muted/50"
                        />
                      </div>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={copyShareLink}
                            >
                              {copied ? (
                                <Check className="h-4 w-4 text-green-500" />
                              ) : (
                                <Copy className="h-4 w-4" />
                              )}
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Copy link</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() => updateShareLinkSettings({ regenerate: true })}
                              disabled={updatingLink}
                            >
                              <RefreshCw className={`h-4 w-4 ${updatingLink ? "animate-spin" : ""}`} />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Generate new link</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>

                    {/* Access Settings */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-xs text-muted-foreground">Access Type</Label>
                        <Select
                          value={shareLinkAccess}
                          onValueChange={(v) => updateShareLinkSettings({ access: v as "public" | "login" })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="public">
                              <div className="flex items-center gap-2">
                                <Globe className="h-3.5 w-3.5" />
                                Public (anyone)
                              </div>
                            </SelectItem>
                            <SelectItem value="login">
                              <div className="flex items-center gap-2">
                                <Lock className="h-3.5 w-3.5" />
                                Requires Login
                              </div>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs text-muted-foreground">Permission</Label>
                        <Select
                          value={shareLinkRole}
                          onValueChange={(v) => updateShareLinkSettings({ role: v as "viewer" | "editor" })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="viewer">
                              <div className="flex items-center gap-2">
                                <Eye className="h-3.5 w-3.5" />
                                Can view
                              </div>
                            </SelectItem>
                            <SelectItem value="editor">
                              <div className="flex items-center gap-2">
                                <Edit3 className="h-3.5 w-3.5" />
                                Can edit
                              </div>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <p className="text-xs text-muted-foreground">
                      {shareLinkAccess === "public" 
                        ? "Anyone with the link can access this collection without logging in."
                        : "Users must be logged in to access this collection via the link."}
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

export default ShareCollectionModal;
