// Agora Token Generator
// Server-side only - uses Node.js crypto

import crypto from 'crypto';

const APP_ID = process.env.AGORA_APP_ID || '';
const APP_CERTIFICATE = process.env.AGORA_APP_CERTIFICATE || '';

// Debug: Log credentials status on module load
console.log('🔧 Agora Token Module Loaded:');
console.log('  - APP_ID:', APP_ID ? `${APP_ID.substring(0, 8)}...${APP_ID.substring(APP_ID.length - 4)} (${APP_ID.length} chars)` : 'NOT SET');
console.log('  - APP_CERTIFICATE:', APP_CERTIFICATE ? `${APP_CERTIFICATE.substring(0, 8)}... (${APP_CERTIFICATE.length} chars)` : 'NOT SET');

// Validate credentials on module load
if (!APP_ID) {
  console.error('❌ AGORA_APP_ID is not set in environment variables');
}
if (!APP_CERTIFICATE) {
  console.error('❌ AGORA_APP_CERTIFICATE is not set in environment variables');
}

// Role constants
export const Role = {
  PUBLISHER: 1,
  SUBSCRIBER: 2,
} as const;

export type RoleType = typeof Role[keyof typeof Role];

// Privilege constants
const Privileges = {
  kJoinChannel: 1,
  kPublishAudioStream: 2,
  kPublishVideoStream: 3,
  kPublishDataStream: 4,
};

class AccessToken {
  appId: string;
  appCertificate: string;
  channelName: string;
  uid: string;
  message: Map<number, number>;

  constructor(appId: string, appCertificate: string, channelName: string, uid: string | number) {
    this.appId = appId;
    this.appCertificate = appCertificate;
    this.channelName = channelName;
    this.uid = uid.toString();
    this.message = new Map();
  }

  addPrivilege(privilege: number, expireTimestamp: number) {
    this.message.set(privilege, expireTimestamp);
  }

  build(): string {
    const timestamp = Math.floor(Date.now() / 1000);
    const salt = Math.floor(Math.random() * 100000000);
    
    // Pack message
    let messageContent = '';
    messageContent += packUint32(salt);
    messageContent += packUint32(timestamp);
    messageContent += packMapUint32(this.message);

    // Sign
    const toSign = `${this.appId}${this.channelName}${this.uid}${messageContent}`;
    const signature = encodeHMac(this.appCertificate, toSign);

    // Pack content
    const crcChannelName = crc32(this.channelName) >>> 0;
    const crcUid = crc32(this.uid) >>> 0;
    
    let content = '';
    content += packString(signature);
    content += packUint32(crcChannelName);
    content += packUint32(crcUid);
    content += packString(messageContent);

    // Final token
    const version = '007';
    return `${version}${Buffer.from(content, 'binary').toString('base64')}`;
  }
}

function packUint16(value: number): string {
  return String.fromCharCode(value & 0xff) + String.fromCharCode((value >> 8) & 0xff);
}

function packUint32(value: number): string {
  return (
    String.fromCharCode(value & 0xff) +
    String.fromCharCode((value >> 8) & 0xff) +
    String.fromCharCode((value >> 16) & 0xff) +
    String.fromCharCode((value >> 24) & 0xff)
  );
}

function packString(value: string): string {
  return packUint16(value.length) + value;
}

function packMapUint32(map: Map<number, number>): string {
  let result = packUint16(map.size);
  map.forEach((value, key) => {
    result += packUint16(key);
    result += packUint32(value);
  });
  return result;
}

function encodeHMac(key: string, message: string): string {
  return crypto.createHmac('sha256', key).update(message, 'binary').digest('binary');
}

// CRC32 table - must be initialized before crc32 function
const crc32Table: number[] = [];
for (let i = 0; i < 256; i++) {
  let c = i;
  for (let j = 0; j < 8; j++) {
    c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  }
  crc32Table[i] = c;
}

// CRC32 implementation
function crc32(str: string): number {
  let crc = -1;
  for (let i = 0; i < str.length; i++) {
    const byte = str.charCodeAt(i);
    crc = crc32Table[(crc ^ byte) & 0xff]! ^ (crc >>> 8);
  }
  return crc ^ -1;
}

/**
 * Generate RTC Token for video streaming
 */
export function generateRtcToken(
  channelName: string,
  uid: number | string,
  role: RoleType,
  expireTimeInSeconds: number = 3600
): string {
  if (!APP_ID || !APP_CERTIFICATE) {
    throw new Error('Agora APP_ID or APP_CERTIFICATE not configured');
  }

  const token = new AccessToken(APP_ID, APP_CERTIFICATE, channelName, uid);
  const expireTimestamp = Math.floor(Date.now() / 1000) + expireTimeInSeconds;

  // Add privileges based on role
  token.addPrivilege(Privileges.kJoinChannel, expireTimestamp);
  
  if (role === Role.PUBLISHER) {
    token.addPrivilege(Privileges.kPublishAudioStream, expireTimestamp);
    token.addPrivilege(Privileges.kPublishVideoStream, expireTimestamp);
    token.addPrivilege(Privileges.kPublishDataStream, expireTimestamp);
  }

  return token.build();
}

/**
 * Generate RTM Token for real-time messaging (chat)
 */
export function generateRtmToken(
  userId: string,
  expireTimeInSeconds: number = 3600
): string {
  if (!APP_ID || !APP_CERTIFICATE) {
    throw new Error('Agora APP_ID or APP_CERTIFICATE not configured');
  }

  const token = new AccessToken(APP_ID, APP_CERTIFICATE, userId, '');
  const expireTimestamp = Math.floor(Date.now() / 1000) + expireTimeInSeconds;
  
  // RTM privilege
  token.addPrivilege(1, expireTimestamp);

  return token.build();
}

export { APP_ID };
