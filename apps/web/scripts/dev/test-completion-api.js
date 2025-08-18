// Test the work order completion API directly
const fetch = require('node-fetch');

async function testCompletionAPI() {
  const workOrderId = 'cme79ikia000d5oy9b8thigvh';
  
  try {
    console.log('🧪 测试工单完成API...');
    console.log('Work Order ID:', workOrderId);
    
    // First try to get a token (if we can)
    console.log('\n1. 尝试获取认证token...');
    let token = null;
    try {
      const loginResponse = await fetch('http://localhost:3001/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          identifier: 'technician',
          password: 'password123'
        })
      });
      
      if (loginResponse.ok) {
        const loginData = await loginResponse.json();
        token = loginData.data?.token;
        console.log('✅ 获取token成功');
      }
    } catch (loginErr) {
      console.log('⚠️  无法获取token，将尝试无认证测试');
    }
    
    // Test the completion API
    console.log('\n2. 测试完成工单API...');
    const completionData = {
      solutionDescription: '测试解决方案描述 - 这是一个详细的解决方案描述，用于测试工单完成功能。问题已经通过更换损坏的部件并重新校准设备来解决。',
      faultCode: 'MECHANICAL_FAILURE',
      photos: []
    };
    
    const headers = {
      'Content-Type': 'application/json'
    };
    
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    const completionResponse = await fetch(`http://localhost:3002/api/work-orders/${workOrderId}/complete`, {
      method: 'POST',
      headers,
      body: JSON.stringify(completionData)
    });
    
    console.log('API响应状态:', completionResponse.status);
    console.log('响应头:', Object.fromEntries(completionResponse.headers.entries()));
    
    const responseText = await completionResponse.text();
    console.log('响应内容:', responseText);
    
    if (completionResponse.status === 200) {
      console.log('✅ API调用成功');
    } else {
      console.log('❌ API调用失败');
    }
    
    // Check if resolution was created
    console.log('\n3. 检查是否创建了解决方案记录...');
    
  } catch (error) {
    console.error('❌ 测试失败:', error.message);
  }
}

testCompletionAPI();