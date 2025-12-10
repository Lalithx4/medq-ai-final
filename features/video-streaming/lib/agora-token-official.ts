// Official Agora Token Generator
// Based on https://github.com/AgoraIO/Tools/blob/master/DynamicKey/AgoraDynamicKey/nodejs/src/RtcTokenBuilder2.js

import crypto from 'crypto';

const APP_ID = process.env.AGORA_APP_ID || '';
const APP_CERTIFICATE = process.env.AGORA_APP_CERTIFICATE || '';

// Debug logging
console.log('🔧 Agora Token Module (Official) Loaded:');
console.log('  - APP_ID:', APP_ID ? `${APP_ID.substring(0, 8)}...${APP_ID.substring(APP_ID.length - 4)} (${APP_ID.length} chars)` : 'NOT SET');
console.log('  - APP_CERTIFICATE:', APP_CERTIFICATE ? `${APP_CERTIFICATE.substring(0, 8)}... (${APP_CERTIFICATE.length} chars)` : 'NOT SET');

export { APP_ID };

// Role constants
export const Role = {
  PUBLISHER: 1,
  SUBSCRIBER: 2,
} as const;

export type RoleType = (typeof Role)[keyof typeof Role];

// Privilege constants
const kJoinChannel = 1;
const kPublishAudioStream = 2;
const kPublishVideoStream = 3;
const kPublishDataStream = 4;

// Version
const VERSION = '007';
const VERSION_LENGTH = 3;

// AccessToken2 class for generating tokens
class AccessToken2 {
  private appId: string;
  private appCert: string;
  private expire: number;
  private salt: number;
  private ts: number;
  private services: Map<number, Service>;

  constructor(appId: string, appCert: string, expire: number = 3600) {
    this.appId = appId;
    this.appCert = appCert;
    this.expire = expire;
    this.salt = Math.floor(Math.random() * 0xffffffff);
    this.ts = Math.floor(Date.now() / 1000);
    this.services = new Map();
  }

  addService(service: Service) {
    this.services.set(service.getServiceType(), service);
  }

  build(): string {
    if (!this.appId || this.appId.length !== 32) {
      throw new Error(`Invalid App ID: ${this.appId}`);
    }
    if (!this.appCert || this.appCert.length !== 32) {
      throw new Error(`Invalid App Certificate: ${this.appCert}`);
    }

    const signing = this.buildSigning();
    const signature = encodeHmac(Buffer.from(this.appCert, 'utf-8'), signing);

    const content = new ByteBuf();
    content.putBytes(signature);
    content.putUint32(this.salt);
    content.putUint32(this.ts);
    content.putUint16(this.expire);

    // Services
    content.putUint16(this.services.size);
    this.services.forEach((service) => {
      content.putBytes(service.pack());
    });

    return VERSION + zlib(content.pack());
  }

  private buildSigning(): Buffer {
    const signing = new ByteBuf();
    signing.putString(this.appId);
    signing.putUint32(this.ts);
    signing.putUint32(this.expire);
    signing.putUint32(this.salt);
    signing.putUint16(this.services.size);

    this.services.forEach((service) => {
      signing.putBytes(service.pack());
    });

    return signing.pack();
  }
}

// Service base class
abstract class Service {
  abstract getServiceType(): number;
  abstract pack(): Buffer;
}

// RTC Service
class ServiceRtc extends Service {
  private channelName: string;
  private uid: string;
  private privileges: Map<number, number>;

  static SERVICE_TYPE = 1;

  constructor(channelName: string, uid: string) {
    super();
    this.channelName = channelName;
    this.uid = uid;
    this.privileges = new Map();
  }

  getServiceType(): number {
    return ServiceRtc.SERVICE_TYPE;
  }

  addPrivilege(privilege: number, expire: number) {
    this.privileges.set(privilege, expire);
  }

  pack(): Buffer {
    const buf = new ByteBuf();
    buf.putUint16(ServiceRtc.SERVICE_TYPE);
    buf.putString(this.channelName);
    buf.putString(this.uid);

    buf.putUint16(this.privileges.size);
    this.privileges.forEach((expire, privilege) => {
      buf.putUint16(privilege);
      buf.putUint32(expire);
    });

    return buf.pack();
  }
}

// ByteBuf utility class
class ByteBuf {
  private buffer: number[] = [];

  putUint16(v: number) {
    this.buffer.push(v & 0xff);
    this.buffer.push((v >> 8) & 0xff);
  }

  putUint32(v: number) {
    this.buffer.push(v & 0xff);
    this.buffer.push((v >> 8) & 0xff);
    this.buffer.push((v >> 16) & 0xff);
    this.buffer.push((v >> 24) & 0xff);
  }

  putString(s: string) {
    const bytes = Buffer.from(s, 'utf-8');
    this.putUint16(bytes.length);
    for (const b of bytes) {
      this.buffer.push(b);
    }
  }

  putBytes(bytes: Buffer) {
    for (const b of bytes) {
      this.buffer.push(b);
    }
  }

  pack(): Buffer {
    return Buffer.from(this.buffer);
  }
}

function encodeHmac(key: Buffer, message: Buffer): Buffer {
  return crypto.createHmac('sha256', key).update(message).digest();
}

function zlib(data: Buffer): string {
  const compressed = require('zlib').deflateSync(data);
  return compressed.toString('base64');
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

  const token = new AccessToken2(APP_ID, APP_CERTIFICATE, expireTimeInSeconds);
  
  const rtcService = new ServiceRtc(channelName, uid.toString());
  rtcService.addPrivilege(kJoinChannel, expireTimeInSeconds);
  
  if (role === Role.PUBLISHER) {
    rtcService.addPrivilege(kPublishAudioStream, expireTimeInSeconds);
    rtcService.addPrivilege(kPublishVideoStream, expireTimeInSeconds);
    rtcService.addPrivilege(kPublishDataStream, expireTimeInSeconds);
  }
  
  token.addService(rtcService);

  const result = token.build();
  console.log('🎫 Generated token:', {
    length: result.length,
    prefix: result.substring(0, 20),
  });
  
  return result;
}

/**
 * Generate RTM Token for real-time messaging (chat)
 */
export function generateRtmToken(
  userId: string,
  expireTimeInSeconds: number = 3600
): string {
  // For RTM, we use a simpler approach
  // RTM uses the same token format but with user ID as channel
  return generateRtcToken(userId, userId, Role.PUBLISHER, expireTimeInSeconds);
}
