// Hook for getting signed file URLs (supports Wasabi and legacy storage)
'use client';

import { useState, useEffect, useCallback } from 'react';

interface UseFileUrlOptions {
  fileId: string;
  inline?: boolean;
  enabled?: boolean;
}

interface FileUrlResult {
  url: string | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useFileUrl({ fileId, inline = false, enabled = true }: UseFileUrlOptions): FileUrlResult {
  const [url, setUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchUrl = useCallback(async () => {
    if (!fileId || !enabled) return;

    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({ fileId });
      if (inline) params.append('inline', 'true');

      const response = await fetch(`/api/file-manager/download?${params}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to get file URL');
      }

      setUrl(data.url);
    } catch (err) {
      console.error('Error fetching file URL:', err);
      setError(err instanceof Error ? err.message : 'Failed to get file URL');
      setUrl(null);
    } finally {
      setIsLoading(false);
    }
  }, [fileId, inline, enabled]);

  useEffect(() => {
    fetchUrl();
  }, [fetchUrl]);

  return { url, isLoading, error, refetch: fetchUrl };
}

// Helper function to get signed URL directly (for one-off use)
export async function getSignedFileUrl(fileId: string, inline = false): Promise<string | null> {
  try {
    const params = new URLSearchParams({ fileId });
    if (inline) params.append('inline', 'true');

    const response = await fetch(`/api/file-manager/download?${params}`);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Failed to get file URL');
    }

    return data.url;
  } catch (err) {
    console.error('Error fetching file URL:', err);
    return null;
  }
}

// Helper to trigger file download
export async function downloadFile(fileId: string, filename: string): Promise<void> {
  const url = await getSignedFileUrl(fileId);
  if (!url) {
    throw new Error('Failed to get download URL');
  }

  // Create temporary link and trigger download
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
