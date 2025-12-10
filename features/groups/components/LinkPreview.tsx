// Link Preview Component - Shows URL metadata preview cards
'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ExternalLink, Globe, Loader2, X, Image as ImageIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LinkMetadata {
  url: string;
  title?: string;
  description?: string;
  image?: string;
  siteName?: string;
  favicon?: string;
}

interface LinkPreviewProps {
  url: string;
  className?: string;
  compact?: boolean;
  onRemove?: () => void;
}

// Extract URLs from text
export function extractUrls(text: string): string[] {
  const urlRegex = /(https?:\/\/[^\s<]+[^<.,:;"')\]\s])/g;
  const matches = text.match(urlRegex);
  return matches || [];
}

// Simple link metadata fetcher (uses a proxy API)
async function fetchLinkMetadata(url: string): Promise<LinkMetadata | null> {
  try {
    // Try our own API endpoint first
    const response = await fetch('/api/link-preview', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url })
    });
    
    if (response.ok) {
      return await response.json();
    }
    
    // Fallback: Return basic metadata from URL
    const urlObj = new URL(url);
    return {
      url,
      siteName: urlObj.hostname,
      title: urlObj.hostname
    };
  } catch (error) {
    console.error('Failed to fetch link metadata:', error);
    return null;
  }
}

export function LinkPreview({
  url,
  className,
  compact = false,
  onRemove
}: LinkPreviewProps) {
  const [metadata, setMetadata] = useState<LinkMetadata | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadMetadata() {
      setIsLoading(true);
      setError(false);
      
      const data = await fetchLinkMetadata(url);
      
      if (!cancelled) {
        if (data) {
          setMetadata(data);
        } else {
          setError(true);
        }
        setIsLoading(false);
      }
    }

    loadMetadata();

    return () => {
      cancelled = true;
    };
  }, [url]);

  if (isLoading) {
    return (
      <div className={cn(
        "flex items-center gap-2 p-3 rounded-lg border bg-muted/30",
        className
      )}>
        <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
        <span className="text-sm text-muted-foreground">Loading preview...</span>
      </div>
    );
  }

  if (error || !metadata) {
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className={cn(
          "flex items-center gap-2 p-2 rounded-lg border bg-muted/30 hover:bg-muted/50 transition-colors",
          className
        )}
      >
        <Globe className="w-4 h-4 text-muted-foreground flex-shrink-0" />
        <span className="text-sm text-primary truncate">{url}</span>
        <ExternalLink className="w-3 h-3 text-muted-foreground flex-shrink-0" />
      </a>
    );
  }

  if (compact) {
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className={cn(
          "group flex items-center gap-2 p-2 rounded-lg border bg-muted/30 hover:bg-muted/50 transition-colors",
          className
        )}
      >
        {metadata.favicon ? (
          <img
            src={metadata.favicon}
            alt=""
            className="w-4 h-4 rounded"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
            }}
          />
        ) : (
          <Globe className="w-4 h-4 text-muted-foreground flex-shrink-0" />
        )}
        <span className="text-sm font-medium truncate flex-1">
          {metadata.title || metadata.siteName || new URL(url).hostname}
        </span>
        <ExternalLink className="w-3 h-3 text-muted-foreground flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
      </a>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "relative rounded-lg border bg-card overflow-hidden",
        "hover:border-muted-foreground/30 transition-colors",
        className
      )}
    >
      {onRemove && (
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onRemove();
          }}
          className="absolute top-2 right-2 z-10 p-1 rounded-full bg-background/80 hover:bg-background text-muted-foreground hover:text-foreground transition-colors"
        >
          <X className="w-3 h-3" />
        </button>
      )}
      
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="block"
      >
        {/* Image */}
        {metadata.image && !imageError && (
          <div className="relative aspect-video w-full bg-muted overflow-hidden">
            <img
              src={metadata.image}
              alt={metadata.title || ''}
              className="w-full h-full object-cover"
              onError={() => setImageError(true)}
            />
          </div>
        )}

        {/* Content */}
        <div className="p-3 space-y-1">
          {/* Site name */}
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            {metadata.favicon ? (
              <img
                src={metadata.favicon}
                alt=""
                className="w-3 h-3 rounded"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
            ) : (
              <Globe className="w-3 h-3" />
            )}
            <span>{metadata.siteName || new URL(url).hostname}</span>
          </div>

          {/* Title */}
          {metadata.title && (
            <h4 className="font-medium text-sm line-clamp-2 text-foreground group-hover:text-primary transition-colors">
              {metadata.title}
            </h4>
          )}

          {/* Description */}
          {metadata.description && (
            <p className="text-xs text-muted-foreground line-clamp-2">
              {metadata.description}
            </p>
          )}
        </div>
      </a>
    </motion.div>
  );
}

// Multi-link preview component
interface MultiLinkPreviewProps {
  urls: string[];
  className?: string;
}

export function MultiLinkPreview({ urls, className }: MultiLinkPreviewProps) {
  if (urls.length === 0) return null;
  
  const firstUrl = urls[0];
  if (urls.length === 1 && firstUrl) {
    return <LinkPreview url={firstUrl} className={className} />;
  }

  return (
    <div className={cn("space-y-2", className)}>
      {urls.slice(0, 3).map((url, index) => (
        <LinkPreview key={index} url={url} compact />
      ))}
      {urls.length > 3 && (
        <p className="text-xs text-muted-foreground">
          +{urls.length - 3} more links
        </p>
      )}
    </div>
  );
}
