const axios = require('axios');

// Configuration
const WORK_ORDER_SERVICE_URL = 'http://localhost:3002';
const ASSET_SERVICE_URL = 'http://localhost:3003';

// You'll need to get a valid JWT token from the user service
// For now, we'll test without authentication first
const TEST_TOKEN = null; // Set this to a valid JWT token for authenticated tests

async function testWorkOrderService() {
  console.log('🔍 Testing Work Order Service...\n');

  try {
    // Test health endpoint
    console.log('1. Testing health endpoint...');
    const healthResponse = await axios.get(`${WORK_ORDER_SERVICE_URL}/health`);
    console.log(`   ✅ Health check: ${healthResponse.data.status}`);
    console.log(`   Service: ${healthResponse.data.service}`);
    console.log(`   Uptime: ${Math.round(healthResponse.data.uptime)}s\n`);

    // Test work orders endpoint (will need auth)
    console.log('2. Testing work orders list endpoint...');
    try {
      const headers = TEST_TOKEN ? { Authorization: `Bearer ${TEST_TOKEN}` } : {};
      const workOrdersResponse = await axios.get(`${WORK_ORDER_SERVICE_URL}/api/work-orders`, { headers });
      console.log(`   ✅ Work orders endpoint accessible`);
      console.log(`   Response structure:`, Object.keys(workOrdersResponse.data));
    } catch (error) {
      if (error.response?.status === 401) {
        console.log(`   ⚠️  Authentication required (status: 401)`);
        console.log(`   Message: ${error.response?.data?.message || 'Unauthorized'}`);
      } else {
        console.log(`   ❌ Error: ${error.message}`);
      }
    }

    console.log('');
  } catch (error) {
    console.error(`❌ Work Order Service Error: ${error.message}\n`);
  }
}

async function testAssetService() {
  console.log('🏭 Testing Asset Service...\n');

  try {
    // Test health endpoint
    console.log('1. Testing health endpoint...');
    const healthResponse = await axios.get(`${ASSET_SERVICE_URL}/api/health`);
    console.log(`   ✅ Health check: ${healthResponse.data.status}`);
    console.log(`   Service: ${healthResponse.data.service}\n`);

    // Test assets endpoint (will need auth)
    console.log('2. Testing assets list endpoint...');
    try {
      const headers = TEST_TOKEN ? { Authorization: `Bearer ${TEST_TOKEN}` } : {};
      const assetsResponse = await axios.get(`${ASSET_SERVICE_URL}/api/assets`, { headers });
      console.log(`   ✅ Assets endpoint accessible`);
      console.log(`   Response structure:`, Object.keys(assetsResponse.data));
    } catch (error) {
      if (error.response?.status === 401) {
        console.log(`   ⚠️  Authentication required (status: 401)`);
        console.log(`   Message: ${error.response?.data?.error || 'Unauthorized'}`);
      } else {
        console.log(`   ❌ Error: ${error.message}`);
      }
    }

    console.log('');
  } catch (error) {
    console.error(`❌ Asset Service Error: ${error.message}\n`);
  }
}

async function testServiceConnectivity() {
  console.log('🌐 Testing Service Connectivity...\n');

  const services = [
    { name: 'Work Order Service', url: WORK_ORDER_SERVICE_URL, healthPath: '/health' },
    { name: 'Asset Service', url: ASSET_SERVICE_URL, healthPath: '/api/health' },
  ];

  for (const service of services) {
    try {
      const startTime = Date.now();
      const response = await axios.get(`${service.url}${service.healthPath}`, { timeout: 5000 });
      const responseTime = Date.now() - startTime;
      
      console.log(`✅ ${service.name}`);
      console.log(`   URL: ${service.url}${service.healthPath}`);
      console.log(`   Status: ${response.status} ${response.statusText}`);
      console.log(`   Response time: ${responseTime}ms`);
      console.log(`   Service status: ${response.data.status || 'unknown'}`);
    } catch (error) {
      console.log(`❌ ${service.name}`);
      console.log(`   URL: ${service.url}${service.healthPath}`);
      if (error.code === 'ECONNREFUSED') {
        console.log(`   Error: Service not running (connection refused)`);
      } else if (error.code === 'TIMEOUT') {
        console.log(`   Error: Request timeout`);
      } else {
        console.log(`   Error: ${error.message}`);
        console.log(`   Status: ${error.response?.status || 'N/A'}`);
      }
    }
    console.log('');
  }
}

async function runDiagnostics() {
  console.log('🚀 Starting API Endpoint Diagnostics...\n');
  console.log('=' .repeat(50));
  
  await testServiceConnectivity();
  await testWorkOrderService();
  await testAssetService();
  
  console.log('📋 Diagnostic Summary:');
  console.log('=' .repeat(50));
  console.log('1. Check that both services are running');
  console.log('2. Verify environment variables are set correctly');
  console.log('3. Test with valid JWT token for full API access');
  console.log('4. Check database connectivity in each service');
  console.log('5. Review service logs for detailed error information');
  console.log('');
  console.log('💡 To get a JWT token for testing:');
  console.log('   1. Start the user service (port 3001)');
  console.log('   2. Login via /api/auth/login endpoint');
  console.log('   3. Use the returned token in this script');
}

if (require.main === module) {
  runDiagnostics();
}

module.exports = { 
  testWorkOrderService, 
  testAssetService, 
  testServiceConnectivity 
};