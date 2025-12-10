// Link Preview API - Fetches URL metadata for link previews
import { NextRequest, NextResponse } from 'next/server';

interface LinkMetadata {
  url: string;
  title?: string;
  description?: string;
  image?: string;
  siteName?: string;
  favicon?: string;
}

// Parse Open Graph and meta tags from HTML
function parseMetaTags(html: string, url: string): LinkMetadata {
  const metadata: LinkMetadata = { url };
  
  // Helper to extract meta content
  const getMetaContent = (name: string, property?: string): string | undefined => {
    const patterns = [
      new RegExp(`<meta[^>]*(?:name|property)=["'](?:${name}${property ? `|${property}` : ''})["'][^>]*content=["']([^"']*)["']`, 'i'),
      new RegExp(`<meta[^>]*content=["']([^"']*)["'][^>]*(?:name|property)=["'](?:${name}${property ? `|${property}` : ''})["']`, 'i')
    ];
    
    for (const pattern of patterns) {
      const match = html.match(pattern);
      if (match?.[1]) return match[1];
    }
    return undefined;
  };
  
  // Get title
  metadata.title = getMetaContent('og:title') || 
    getMetaContent('twitter:title') ||
    html.match(/<title[^>]*>([^<]*)<\/title>/i)?.[1]?.trim();
  
  // Get description
  metadata.description = getMetaContent('og:description') || 
    getMetaContent('twitter:description') ||
    getMetaContent('description');
  
  // Get image
  metadata.image = getMetaContent('og:image') || 
    getMetaContent('twitter:image') ||
    getMetaContent('twitter:image:src');
  
  // Make image URL absolute if relative
  if (metadata.image && !metadata.image.startsWith('http')) {
    try {
      const urlObj = new URL(url);
      if (metadata.image.startsWith('//')) {
        metadata.image = `${urlObj.protocol}${metadata.image}`;
      } else if (metadata.image.startsWith('/')) {
        metadata.image = `${urlObj.origin}${metadata.image}`;
      } else {
        metadata.image = `${urlObj.origin}/${metadata.image}`;
      }
    } catch {}
  }
  
  // Get site name
  metadata.siteName = getMetaContent('og:site_name') || 
    getMetaContent('application-name');
  
  // Try to get favicon
  const faviconMatch = html.match(/<link[^>]*rel=["'](?:icon|shortcut icon)["'][^>]*href=["']([^"']*)["']/i) ||
    html.match(/<link[^>]*href=["']([^"']*)["'][^>]*rel=["'](?:icon|shortcut icon)["']/i);
  
  if (faviconMatch?.[1]) {
    let favicon = faviconMatch[1];
    if (!favicon.startsWith('http')) {
      try {
        const urlObj = new URL(url);
        if (favicon.startsWith('//')) {
          favicon = `${urlObj.protocol}${favicon}`;
        } else if (favicon.startsWith('/')) {
          favicon = `${urlObj.origin}${favicon}`;
        } else {
          favicon = `${urlObj.origin}/${favicon}`;
        }
      } catch {}
    }
    metadata.favicon = favicon;
  } else {
    // Default favicon path
    try {
      const urlObj = new URL(url);
      metadata.favicon = `${urlObj.origin}/favicon.ico`;
    } catch {}
  }
  
  return metadata;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { url } = body;
    
    if (!url) {
      return NextResponse.json(
        { error: 'URL is required' },
        { status: 400 }
      );
    }
    
    // Validate URL
    let validUrl: URL;
    try {
      validUrl = new URL(url);
      if (!['http:', 'https:'].includes(validUrl.protocol)) {
        throw new Error('Invalid protocol');
      }
    } catch {
      return NextResponse.json(
        { error: 'Invalid URL' },
        { status: 400 }
      );
    }
    
    // Fetch the URL
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    
    try {
      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; LinkPreview/1.0)',
          'Accept': 'text/html,application/xhtml+xml',
          'Accept-Language': 'en-US,en;q=0.9'
        }
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        // Return basic metadata for failed requests
        return NextResponse.json({
          url,
          siteName: validUrl.hostname,
          title: validUrl.hostname
        });
      }
      
      const contentType = response.headers.get('content-type') || '';
      
      // If it's not HTML, return basic metadata
      if (!contentType.includes('text/html')) {
        return NextResponse.json({
          url,
          siteName: validUrl.hostname,
          title: validUrl.pathname.split('/').pop() || validUrl.hostname
        });
      }
      
      // Read HTML (limit to first 50KB to avoid large pages)
      const reader = response.body?.getReader();
      if (!reader) {
        return NextResponse.json({
          url,
          siteName: validUrl.hostname
        });
      }
      
      let html = '';
      const decoder = new TextDecoder();
      
      while (html.length < 50000) {
        const { done, value } = await reader.read();
        if (done) break;
        html += decoder.decode(value, { stream: true });
      }
      
      reader.cancel();
      
      // Parse metadata
      const metadata = parseMetaTags(html, url);
      
      return NextResponse.json(metadata);
      
    } catch (fetchError: any) {
      clearTimeout(timeoutId);
      
      if (fetchError.name === 'AbortError') {
        // Timeout - return basic metadata
        return NextResponse.json({
          url,
          siteName: validUrl.hostname,
          title: validUrl.hostname
        });
      }
      
      throw fetchError;
    }
    
  } catch (error) {
    console.error('Link preview error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch link preview' },
      { status: 500 }
    );
  }
}
