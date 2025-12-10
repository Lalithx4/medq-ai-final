#!/usr/bin/env node

/**
 * Database connectivity diagnostic script
 * Tests Prisma connection and environment variables
 */

import { PrismaClient } from '@prisma/client';
import { config } from 'dotenv';
import { resolve } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env.local
config({ path: resolve(__dirname, '../.env.local') });
config({ path: resolve(__dirname, '../.env') });

console.log('\n=== Database Connectivity Test ===\n');

// 1. Check environment variables
console.log('1. Checking environment variables:');
const DATABASE_URL = process.env.DATABASE_URL;
const DIRECT_URL = process.env.DIRECT_URL;

if (!DATABASE_URL) {
  console.log('   ✖ DATABASE_URL is NOT set');
} else {
  // Mask password for security
  const masked = DATABASE_URL.replace(/:([^:@]+)@/, ':****@');
  console.log(`   ✔ DATABASE_URL is set: ${masked}`);
  
  // Parse and validate
  try {
    const url = new URL(DATABASE_URL.replace('postgresql://', 'http://'));
    console.log(`   ↳ Host: ${url.hostname}`);
    console.log(`   ↳ Port: ${url.port || '5432'}`);
    console.log(`   ↳ Database: ${url.pathname.slice(1).split('?')[0]}`);
    
    const params = new URLSearchParams(url.search);
    console.log(`   ↳ SSL mode: ${params.get('sslmode') || 'not specified'}`);
    console.log(`   ↳ PgBouncer: ${params.get('pgbouncer') || 'not specified'}`);
    console.log(`   ↳ Connection limit: ${params.get('connection_limit') || 'not specified'}`);
  } catch (e) {
    console.log(`   ✖ Invalid DATABASE_URL format: ${e.message}`);
  }
}

if (!DIRECT_URL) {
  console.log('   ⚠ DIRECT_URL is NOT set (optional for dev, required for migrations)');
} else {
  const masked = DIRECT_URL.replace(/:([^:@]+)@/, ':****@');
  console.log(`   ✔ DIRECT_URL is set: ${masked}`);
}

console.log('');

// 2. Test Prisma connection
console.log('2. Testing Prisma connection:');
const prisma = new PrismaClient({
  log: ['error', 'warn'],
});

let dbConnected = false;

try {
  console.log('   → Attempting to connect...');
  const start = Date.now();
  
  // Simple query to test connection
  await prisma.$queryRaw`SELECT 1 as test`;
  
  const elapsed = Date.now() - start;
  console.log(`   ✔ Connection successful (${elapsed}ms)`);
  dbConnected = true;
  
  // Try to query user table
  console.log('   → Testing user table access...');
  const userCount = await prisma.user.count();
  console.log(`   ✔ User table accessible (${userCount} users)`);
  
} catch (error) {
  console.log(`   ✖ Connection failed: ${error.message}`);
  console.log('');
  console.log('   Error details:');
  console.log(`   ↳ Name: ${error.name}`);
  console.log(`   ↳ Code: ${error.code || 'N/A'}`);
  
  if (error.message.includes("Can't reach database server")) {
    console.log('');
    console.log('   Possible causes:');
    console.log('   • DATABASE_URL is incorrect or missing');
    console.log('   • Database server is down');
    console.log('   • Network/firewall blocking port 5432');
    console.log('   • VPN or corporate proxy interference');
    console.log('   • SSL/TLS configuration mismatch');
  }
  
  if (error.message.includes('SSL')) {
    console.log('');
    console.log('   SSL-related issue detected:');
    console.log('   • Ensure sslmode=require is in your DATABASE_URL');
    console.log('   • Supabase requires SSL connections');
  }
} finally {
  await prisma.$disconnect();
}

console.log('');

// 3. Network connectivity test
console.log('3. Testing network connectivity:');
if (DATABASE_URL) {
  try {
    const url = new URL(DATABASE_URL.replace('postgresql://', 'http://'));
    const host = url.hostname;
    const port = url.port || '5432';
    
    console.log(`   → Testing TCP connection to ${host}:${port}...`);
    
    // Use Node's net module for TCP test
    const net = await import('net');
    const socket = new net.Socket();
    
    await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        socket.destroy();
        reject(new Error('Connection timeout (10s)'));
      }, 10000);
      
      socket.connect(parseInt(port), host, () => {
        clearTimeout(timeout);
        socket.destroy();
        resolve();
      });
      
      socket.on('error', (err) => {
        clearTimeout(timeout);
        reject(err);
      });
    });
    
    console.log(`   ✔ TCP connection to ${host}:${port} successful`);
  } catch (error) {
    console.log(`   ✖ TCP connection failed: ${error.message}`);
    console.log('');
    console.log('   This indicates a network-level issue:');
    console.log('   • Port 5432 may be blocked by firewall');
    console.log('   • VPN may be required');
    console.log('   • Host may be unreachable from your network');
  }
}

console.log('');

// 4. Summary and recommendations
console.log('=== Summary ===\n');

if (dbConnected) {
  console.log('✔ Database is accessible and working correctly');
  console.log('  No action needed.');
} else {
  console.log('✖ Database connection failed\n');
  console.log('Recommended actions:');
  console.log('1. Verify DATABASE_URL in .env.local');
  console.log('2. Check Supabase project status at https://supabase.com/dashboard');
  console.log('3. Ensure your IP is not blocked');
  console.log('4. Test from Supabase SQL Editor to confirm credentials');
  console.log('5. Check if VPN is required for database access');
  console.log('');
  console.log('Example DATABASE_URL format for Supabase:');
  console.log('postgresql://USER:PASSWORD@aws-1-ap-south-1.pooler.supabase.com:5432/postgres?pgbouncer=true&connection_limit=1&sslmode=require');
}

console.log('');
process.exit(dbConnected ? 0 : 1);
