/**
 * Test script to check credits API
 * Run with: node test-credits.js
 */

const http = require('http');

// Test the credits balance API
async function testCreditsAPI() {
  console.log('🧪 Testing Credits API...\n');

  const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/api/credits/balance',
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    }
  };

  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';

      console.log(`📊 Status Code: ${res.statusCode}`);
      console.log(`📋 Headers:`, JSON.stringify(res.headers, null, 2));

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        console.log('\n📦 Raw Response:', data);
        
        try {
          const parsed = JSON.parse(data);
          console.log('\n✅ Parsed Response:', JSON.stringify(parsed, null, 2));
          
          if (parsed.credits !== undefined) {
            console.log(`\n💰 Credits Value: ${parsed.credits}`);
            console.log(`📊 Credits Type: ${typeof parsed.credits}`);
          } else {
            console.log('\n❌ No credits field in response!');
          }
          
          if (parsed.error) {
            console.log(`\n⚠️  Error in response: ${parsed.error}`);
          }
          
          resolve(parsed);
        } catch (e) {
          console.log('\n❌ Failed to parse JSON:', e.message);
          reject(e);
        }
      });
    });

    req.on('error', (error) => {
      console.error('\n❌ Request failed:', error.message);
      reject(error);
    });

    req.end();
  });
}

// Test direct database query
async function testDatabaseQuery() {
  console.log('\n\n🗄️  Testing Direct Database Query...\n');
  
  try {
    // Import Prisma client
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();
    
    console.log('📡 Connecting to database...');
    
    // Get first user to test
    const user = await prisma.user.findFirst({
      select: {
        id: true,
        email: true,
        credits: true,
      }
    });
    
    if (user) {
      console.log('✅ Database connection successful!');
      console.log('\n👤 Sample User:');
      console.log(`   ID: ${user.id}`);
      console.log(`   Email: ${user.email}`);
      console.log(`   Credits: ${user.credits}`);
      console.log(`   Credits Type: ${typeof user.credits}`);
    } else {
      console.log('⚠️  No users found in database');
    }
    
    await prisma.$disconnect();
    return user;
  } catch (error) {
    console.error('❌ Database query failed:', error.message);
    if (error.code) {
      console.error(`   Error Code: ${error.code}`);
    }
    return null;
  }
}

// Main test function
async function runTests() {
  console.log('═══════════════════════════════════════════════════════');
  console.log('🔬 CREDITS API TEST SUITE');
  console.log('═══════════════════════════════════════════════════════\n');

  // Test 1: Database Query
  const dbResult = await testDatabaseQuery();
  
  // Test 2: API Endpoint
  try {
    const apiResult = await testCreditsAPI();
    
    // Compare results
    console.log('\n\n📊 COMPARISON:');
    console.log('═══════════════════════════════════════════════════════');
    if (dbResult && apiResult) {
      console.log(`Database Credits: ${dbResult.credits}`);
      console.log(`API Credits: ${apiResult.credits}`);
      
      if (dbResult.credits === apiResult.credits) {
        console.log('✅ Values match!');
      } else {
        console.log('❌ Values DO NOT match!');
      }
    }
  } catch (error) {
    console.error('\n❌ API test failed:', error.message);
  }
  
  console.log('\n═══════════════════════════════════════════════════════');
  console.log('✅ Tests Complete');
  console.log('═══════════════════════════════════════════════════════\n');
}

// Run the tests
runTests().catch(console.error);
