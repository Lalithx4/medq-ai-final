/**
 * MiroTalk SFU Client Library
 * 
 * Integrates with self-hosted MiroTalk SFU at video.biodocs.ai
 * Handles meeting creation, token generation, and join URLs
 */

import * as crypto from 'crypto';
import * as jwt from 'jsonwebtoken';
import CryptoJS from 'crypto-js';

const MIROTALK_API_URL = process.env.MIROTALK_API_URL || 'https://video.biodocs.ai/api/v1';
const MIROTALK_API_SECRET = process.env.MIROTALK_API_SECRET || '';
// JWT secret for token encryption - separate from API secret
const JWT_SECRET = process.env.MIROTALK_JWT_SECRET || process.env.MIROTALK_API_SECRET || '';

export interface MiroTalkUser {
  id: string;
  name?: string | null;
  email?: string | null;
  image?: string | null;
}

export interface CreateMeetingResponse {
  meeting: string;
}

export interface TokenResponse {
  token: string;
}

export interface JoinUrlResponse {
  join: string;
}

export interface Meeting {
  id: string;
  participants: number;
}

export interface ActiveMeetingsResponse {
  meetings: Meeting[];
}

export interface JoinOptions {
  audio?: boolean;
  video?: boolean;
  screen?: boolean;
  notify?: boolean;
}

/**
 * Check if MiroTalk is configured
 */
export function isMiroTalkConfigured(): boolean {
  return !!MIROTALK_API_SECRET;
}

/**
 * Create a new meeting room
 * @returns Meeting URL
 */
export async function createMeeting(): Promise<CreateMeetingResponse> {
  if (!isMiroTalkConfigured()) {
    throw new Error('MiroTalk API is not configured. Set MIROTALK_API_SECRET.');
  }

  const response = await fetch(`${MIROTALK_API_URL}/meeting`, {
    method: 'POST',
    headers: {
      'authorization': MIROTALK_API_SECRET,
      'Content-Type': 'application/json'
    }
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to create meeting: ${error}`);
  }

  return response.json();
}

/**
 * Generate a JWT token for a user to join a meeting
 * 
 * @param user - User from Supabase
 * @param isPresenter - Is this user the host/presenter?
 * @param expiry - Token expiry (e.g., '1h', '24h', '7d')
 * @returns Token response
 */
export async function generateUserToken(
  user: MiroTalkUser,
  isPresenter: boolean = false,
  expiry: string = '2h'
): Promise<TokenResponse> {
  if (!isMiroTalkConfigured()) {
    throw new Error('MiroTalk API is not configured. Set MIROTALK_API_SECRET.');
  }

  const response = await fetch(`${MIROTALK_API_URL}/token`, {
    method: 'POST',
    headers: {
      'authorization': MIROTALK_API_SECRET,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      username: user.email || user.id,
      password: user.id, // Use user ID as password (token is signed, so this is safe)
      presenter: isPresenter,
      expire: expiry
    })
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to generate token: ${error}`);
  }

  return response.json();
}

/**
 * Create a direct join URL for a user
 * This uses MiroTalk's /join API which returns a complete URL with embedded token
 * 
 * @param roomId - Room ID or name
 * @param user - User from database
 * @param options - Join options
 * @returns Join URL response with complete URL including token
 */
export async function createJoinUrl(
  roomId: string,
  user: MiroTalkUser,
  options: JoinOptions = {}
): Promise<JoinUrlResponse> {
  if (!isMiroTalkConfigured()) {
    throw new Error('MiroTalk API is not configured. Set MIROTALK_API_SECRET.');
  }

  const response = await fetch(`${MIROTALK_API_URL}/join`, {
    method: 'POST',
    headers: {
      'authorization': MIROTALK_API_SECRET,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      room: roomId,
      name: user.name || user.email || 'Guest',
      audio: options.audio ?? true,
      video: options.video ?? true,
      screen: options.screen ?? false,
      notify: options.notify ?? true,
      token: true // This makes MiroTalk include the JWT token in the returned URL
    })
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to create join URL: ${error}`);
  }

  return response.json();
}

/**
 * Create a direct join URL for a presenter/host
 * @param roomId - Room ID
 * @param user - User from database
 * @returns Complete join URL with token
 */
export async function createPresenterJoinUrl(
  roomId: string,
  user: MiroTalkUser
): Promise<string> {
  // First generate a presenter token
  const { token } = await generateUserToken(user, true, '4h');
  
  // Then create join URL with the token
  const baseUrl = process.env.MIROTALK_BASE_URL || 'https://video.biodocs.ai';
  return `${baseUrl}/join/${roomId}?token=${token}`;
}

/**
 * Get all active meetings
 * @returns Active meetings list
 */
export async function getActiveMeetings(): Promise<ActiveMeetingsResponse> {
  if (!isMiroTalkConfigured()) {
    throw new Error('MiroTalk API is not configured. Set MIROTALK_API_SECRET.');
  }

  const response = await fetch(`${MIROTALK_API_URL}/meetings`, {
    headers: {
      'authorization': MIROTALK_API_SECRET
    }
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to get meetings: ${error}`);
  }

  return response.json();
}

/**
 * Extract room ID from a MiroTalk meeting URL
 * @param meetingUrl - Full meeting URL
 * @returns Room ID
 */
export function extractRoomId(meetingUrl: string): string {
  const parts = meetingUrl.split('/join/');
  return parts[1] || meetingUrl;
}

/**
 * Build a full meeting URL with token
 * For MiroTalk SFU, the URL format is: /join?room={roomId}&token={token}
 * @param roomId - Room ID
 * @param token - JWT token
 * @returns Full meeting URL
 */
export function buildMeetingUrl(roomId: string, token?: string): string {
  const baseUrl = process.env.MIROTALK_BASE_URL || 'https://video.biodocs.ai';
  
  // MiroTalk SFU uses query parameters for room and token
  const params = new URLSearchParams();
  params.set('room', roomId);
  if (token) {
    params.set('token', token);
  }
  
  return `${baseUrl}/join?${params.toString()}`;
}

// =============================================================================
// AD-ENABLED MEETING URL GENERATION
// =============================================================================

export interface AdData {
  sponsor: string;
  sponsorLogo: string | null;
  message: string | null;
  url: string;
  ctaText: string;
  impressionId: string;
  campaignId: string;
  trackingUrl: string;
}

export interface MeetingWithAdOptions {
  roomId: string;
  isPresenter?: boolean;
  redirectUrl?: string;
}

/**
 * Generate a meeting URL with embedded ad data
 * This creates a custom JWT token with encrypted payload containing ad info
 * that MiroTalk can decode and display
 * 
 * @param options - Meeting options
 * @param user - User object
 * @param adData - Selected ad data (or null if no ad)
 * @returns Meeting URL with embedded token
 */
export function generateMeetingUrlWithAd(
  options: MeetingWithAdOptions,
  user: MiroTalkUser,
  adData: AdData | null = null
): { url: string; token: string } {
  const {
    roomId,
    isPresenter = false,
    redirectUrl = 'https://biodocs.ai',
  } = options;

  const baseUrl = process.env.MIROTALK_BASE_URL || 'https://video.biodocs.ai';

  // Create JWT payload with user info and ad data
  const payload = {
    username: user.name || user.email?.split('@')[0] || 'Guest',
    password: crypto.randomBytes(8).toString('hex'),
    presenter: isPresenter ? '1' : '0',
    ad: adData,
    redirectUrl,
    userImage: user.image,
    userId: user.id,
  };

  console.log('🔒 [MIROTALK CLIENT] Generating token with payload:', JSON.stringify({
    ...payload,
    password: '***',
    ad: payload.ad ? 'present (see above)' : 'null'
  }));

  // Encrypt payload with AES
  const encryptedPayload = CryptoJS.AES.encrypt(
    JSON.stringify(payload),
    JWT_SECRET
  ).toString();

  // Create JWT token containing encrypted payload
  const token = jwt.sign(
    { data: encryptedPayload },
    JWT_SECRET,
    { expiresIn: '24h' }
  );

  console.log('🎟️ [MIROTALK CLIENT] Token generated successfully, length:', token.length);

  // Build meeting URL
  const meetingUrl = new URL(`${baseUrl}/join`);
  meetingUrl.searchParams.set('room', roomId);
  meetingUrl.searchParams.set('roomPassword', 'false');
  meetingUrl.searchParams.set('name', payload.username);
  meetingUrl.searchParams.set('audio', 'true');
  meetingUrl.searchParams.set('video', 'true');
  meetingUrl.searchParams.set('screen', 'false');
  meetingUrl.searchParams.set('hide', 'false');
  meetingUrl.searchParams.set('notify', 'true');
  meetingUrl.searchParams.set('token', token);

  return {
    url: meetingUrl.toString(),
    token,
  };
}

/**
 * Create a join URL with ad data using the custom token approach
 * This is the recommended method for ad-enabled meetings
 * 
 * @param roomId - Room ID
 * @param user - User from database
 * @param isPresenter - Is this user the presenter/host?
 * @param adData - Selected ad data (or null)
 * @returns Complete join URL with embedded ad token
 */
export function createJoinUrlWithAd(
  roomId: string,
  user: MiroTalkUser,
  isPresenter: boolean = false,
  adData: AdData | null = null
): string {
  const { url } = generateMeetingUrlWithAd(
    { roomId, isPresenter },
    user,
    adData
  );
  return url;
}
