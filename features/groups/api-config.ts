// Groups API Configuration
// Uses Next.js API routes which handle Supabase directly
// FastAPI backend is only used for WebSocket connections

export const GROUPS_API_URL = process.env.NEXT_PUBLIC_GROUPS_API_URL || 'http://localhost:8000';

// Helper to build API URLs - uses Next.js API routes (same origin)
export function groupsApi(path: string): string {
  // If path starts with /api, use it directly (Next.js route)
  // This avoids CORS issues by keeping requests on same origin
  if (path.startsWith('/api')) {
    return path;
  }
  return `/api${path}`;
}

// WebSocket URL for real-time chat - connects to FastAPI backend
export function groupsWsUrl(groupId: string, token: string): string {
  // Always connect to FastAPI for WebSocket
  const wsBase = GROUPS_API_URL.replace('http://', 'ws://').replace('https://', 'wss://');
  return `${wsBase}/ws/groups/${groupId}?token=${token}`;
}
