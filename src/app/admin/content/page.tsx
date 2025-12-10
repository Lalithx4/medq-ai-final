'use client';

import { useEffect, useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  FileText,
  Search,
  Filter,
  MoreHorizontal,
  Download,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Eye,
  Trash2,
  File,
  Image,
  Video,
  FileSpreadsheet,
  Calendar,
  User,
  HardDrive,
  CheckCircle,
  XCircle,
  Clock,
  ArrowUpDown,
  FolderOpen,
  BarChart3,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { getBrowserSupabase } from '@/lib/supabase/client';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface Document {
  id: string;
  filename: string;
  original_name: string;
  file_url: string;
  file_size: number;
  page_count: number | null;
  status: string;
  createdAt: string;
  user_id: string;
  user_email?: string;
  userName?: string;
}

interface ContentStats {
  totalDocuments: number;
  totalSize: number;
  processedDocs: number;
  pendingDocs: number;
  failedDocs: number;
  avgPageCount: number;
}

const ITEMS_PER_PAGE = 10;

export default function ContentPage() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [stats, setStats] = useState<ContentStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [sortField, setSortField] = useState<string>('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [docToDelete, setDocToDelete] = useState<Document | null>(null);
  const [activeTab, setActiveTab] = useState('documents');

  useEffect(() => {
    fetchDocuments();
    fetchStats();
  }, []);

  const fetchDocuments = async () => {
    setIsLoading(true);
    try {
      const supabase = getBrowserSupabase();
      
      // Fetch documents with user info
      const { data, error } = await supabase
        .from('pdf_documents')
        .select(`
          *,
          users:user_id (
            email,
            name
          )
        `)
        .order('createdAt', { ascending: false });

      if (error) throw error;

      const formattedDocs = (data || []).map((doc: any) => ({
        ...doc,
        user_email: doc.users?.email,
        userName: doc.users?.name,
      }));

      setDocuments(formattedDocs);
    } catch (error) {
      console.error('Error fetching documents:', error);
      toast.error('Failed to fetch documents');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const supabase = getBrowserSupabase();

      const { data: docs } = await supabase
        .from('pdf_documents')
        .select('file_size, page_count, status');

      if (docs) {
        const totalSize = docs.reduce((sum, d) => sum + (d.file_size || 0), 0);
        const processedDocs = docs.filter((d) => d.status === 'processed').length;
        const pendingDocs = docs.filter((d) => d.status === 'pending').length;
        const failedDocs = docs.filter((d) => d.status === 'error').length;
        const docsWithPages = docs.filter((d) => d.page_count);
        const avgPageCount = docsWithPages.length
          ? docsWithPages.reduce((sum, d) => sum + (d.page_count || 0), 0) / docsWithPages.length
          : 0;

        setStats({
          totalDocuments: docs.length,
          totalSize,
          processedDocs,
          pendingDocs,
          failedDocs,
          avgPageCount: Math.round(avgPageCount),
        });
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const filteredDocuments = useMemo(() => {
    let result = [...documents];

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (doc) =>
          doc.filename?.toLowerCase().includes(query) ||
          doc.original_name?.toLowerCase().includes(query) ||
          doc.user_email?.toLowerCase().includes(query)
      );
    }

    if (statusFilter !== 'all') {
      result = result.filter((doc) => doc.status === statusFilter);
    }

    result.sort((a, b) => {
      const aVal = a[sortField as keyof Document];
      const bVal = b[sortField as keyof Document];

      if (aVal === null || aVal === undefined) return 1;
      if (bVal === null || bVal === undefined) return -1;

      if (sortOrder === 'asc') {
        return aVal > bVal ? 1 : -1;
      } else {
        return aVal < bVal ? 1 : -1;
      }
    });

    return result;
  }, [documents, searchQuery, statusFilter, sortField, sortOrder]);

  const paginatedDocuments = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredDocuments.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredDocuments, currentPage]);

  const totalPages = Math.ceil(filteredDocuments.length / ITEMS_PER_PAGE);

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  const handleDeleteDocument = async () => {
    if (!docToDelete) return;

    try {
      const supabase = getBrowserSupabase();
      const { error } = await supabase
        .from('pdf_documents')
        .delete()
        .eq('id', docToDelete.id);

      if (error) throw error;

      setDocuments(documents.filter((d) => d.id !== docToDelete.id));
      toast.success('Document deleted successfully');
      setShowDeleteDialog(false);
      setDocToDelete(null);
      fetchStats();
    } catch (error) {
      console.error('Error deleting document:', error);
      toast.error('Failed to delete document');
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'processed':
        return (
          <Badge className="bg-green-500/10 text-green-500 gap-1">
            <CheckCircle className="w-3 h-3" />
            Processed
          </Badge>
        );
      case 'pending':
        return (
          <Badge className="bg-yellow-500/10 text-yellow-500 gap-1">
            <Clock className="w-3 h-3" />
            Pending
          </Badge>
        );
      case 'error':
        return (
          <Badge className="bg-red-500/10 text-red-500 gap-1">
            <XCircle className="w-3 h-3" />
            Failed
          </Badge>
        );
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const StatCard = ({
    title,
    value,
    icon: Icon,
    color,
    subtitle,
  }: {
    title: string;
    value: string | number;
    icon: any;
    color: string;
    subtitle?: string;
  }) => (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-4">
          <div className={cn('p-3 rounded-xl', color)}>
            <Icon className="w-5 h-5" />
          </div>
          <div>
            <p className="text-2xl font-bold">{value}</p>
            <p className="text-sm text-muted-foreground">{title}</p>
            {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <FileText className="w-8 h-8" />
            Content Management
          </h1>
          <p className="text-muted-foreground">
            Manage all documents and content on the platform
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={fetchDocuments} className="gap-2">
            <RefreshCw className="w-4 h-4" />
            Refresh
          </Button>
          <Button variant="outline" className="gap-2">
            <Download className="w-4 h-4" />
            Export
          </Button>
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <StatCard
            title="Total Documents"
            value={stats.totalDocuments.toLocaleString()}
            icon={FileText}
            color="bg-primary/10 text-primary"
          />
          <StatCard
            title="Total Storage"
            value={formatFileSize(stats.totalSize)}
            icon={HardDrive}
            color="bg-blue-500/10 text-blue-500"
          />
          <StatCard
            title="Processed"
            value={stats.processedDocs}
            icon={CheckCircle}
            color="bg-green-500/10 text-green-500"
          />
          <StatCard
            title="Pending"
            value={stats.pendingDocs}
            icon={Clock}
            color="bg-yellow-500/10 text-yellow-500"
          />
          <StatCard
            title="Failed"
            value={stats.failedDocs}
            icon={XCircle}
            color="bg-red-500/10 text-red-500"
          />
          <StatCard
            title="Avg. Pages"
            value={stats.avgPageCount}
            icon={File}
            color="bg-purple-500/10 text-purple-500"
          />
        </div>
      )}

      {/* Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="documents" className="gap-2">
            <FileText className="w-4 h-4" />
            Documents
          </TabsTrigger>
          <TabsTrigger value="storage" className="gap-2">
            <HardDrive className="w-4 h-4" />
            Storage
          </TabsTrigger>
        </TabsList>

        <TabsContent value="documents" className="space-y-4">
          {/* Filters */}
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by filename or user..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="processed">Processed</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="error">Failed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Documents Table */}
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Document</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead
                      className="cursor-pointer"
                      onClick={() => handleSort('file_size')}
                    >
                      <div className="flex items-center gap-1">
                        Size
                        <ArrowUpDown className="w-4 h-4" />
                      </div>
                    </TableHead>
                    <TableHead>Pages</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead
                      className="cursor-pointer"
                      onClick={() => handleSort('createdAt')}
                    >
                      <div className="flex items-center gap-1">
                        Uploaded
                        <ArrowUpDown className="w-4 h-4" />
                      </div>
                    </TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <TableRow key={i}>
                        <TableCell colSpan={7}>
                          <div className="h-12 bg-muted animate-pulse rounded" />
                        </TableCell>
                      </TableRow>
                    ))
                  ) : paginatedDocuments.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8">
                        <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-2" />
                        <p className="text-muted-foreground">No documents found</p>
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginatedDocuments.map((doc) => (
                      <TableRow key={doc.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-red-500/10 flex items-center justify-center">
                              <File className="w-5 h-5 text-red-500" />
                            </div>
                            <div>
                              <p className="font-medium truncate max-w-[200px]">
                                {doc.original_name || doc.filename}
                              </p>
                              <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                                {doc.id}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <User className="w-4 h-4 text-muted-foreground" />
                            <span className="text-sm truncate max-w-[150px]">
                              {doc.userName || doc.user_email || 'Unknown'}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>{formatFileSize(doc.file_size)}</TableCell>
                        <TableCell>{doc.page_count || '-'}</TableCell>
                        <TableCell>{getStatusBadge(doc.status)}</TableCell>
                        <TableCell>
                          {format(new Date(doc.createdAt), 'MMM d, yyyy')}
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreHorizontal className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuLabel>Actions</DropdownMenuLabel>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => window.open(doc.file_url, '_blank')}
                              >
                                <Eye className="w-4 h-4 mr-2" />
                                View Document
                              </DropdownMenuItem>
                              <DropdownMenuItem>
                                <Download className="w-4 h-4 mr-2" />
                                Download
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-destructive"
                                onClick={() => {
                                  setDocToDelete(doc);
                                  setShowDeleteDialog(true);
                                }}
                              >
                                <Trash2 className="w-4 h-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between px-4 py-3 border-t">
                  <p className="text-sm text-muted-foreground">
                    Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1} to{' '}
                    {Math.min(currentPage * ITEMS_PER_PAGE, filteredDocuments.length)} of{' '}
                    {filteredDocuments.length} documents
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(currentPage - 1)}
                      disabled={currentPage === 1}
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </Button>
                    <span className="text-sm">
                      Page {currentPage} of {totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(currentPage + 1)}
                      disabled={currentPage === totalPages}
                    >
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="storage" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Storage Usage</CardTitle>
              <CardDescription>Platform storage breakdown by type</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">PDF Documents</span>
                    <span className="text-sm text-muted-foreground">
                      {stats ? formatFileSize(stats.totalSize * 0.7) : '0 B'}
                    </span>
                  </div>
                  <Progress value={70} className="h-2" />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Presentations</span>
                    <span className="text-sm text-muted-foreground">
                      {stats ? formatFileSize(stats.totalSize * 0.15) : '0 B'}
                    </span>
                  </div>
                  <Progress value={15} className="h-2" />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Video Recordings</span>
                    <span className="text-sm text-muted-foreground">
                      {stats ? formatFileSize(stats.totalSize * 0.1) : '0 B'}
                    </span>
                  </div>
                  <Progress value={10} className="h-2" />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Other Files</span>
                    <span className="text-sm text-muted-foreground">
                      {stats ? formatFileSize(stats.totalSize * 0.05) : '0 B'}
                    </span>
                  </div>
                  <Progress value={5} className="h-2" />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Document</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this document? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          {docToDelete && (
            <div className="flex items-center gap-3 p-4 bg-muted/50 rounded-lg">
              <File className="w-8 h-8 text-red-500" />
              <div>
                <p className="font-medium">{docToDelete.original_name}</p>
                <p className="text-sm text-muted-foreground">
                  {formatFileSize(docToDelete.file_size)}
                </p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteDocument}>
              Delete Document
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
