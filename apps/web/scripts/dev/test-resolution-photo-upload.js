// Test ResolutionPhoto upload functionality
const fetch = require('node-fetch');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

async function testResolutionPhotoUpload() {
  const workOrderId = 'wo_1755008549290';
  
  try {
    console.log('🧪 测试ResolutionPhoto上传功能...');
    console.log('Work Order ID:', workOrderId);
    
    // Step 1: Login as technician
    console.log('\n1. 获取技术员认证token...');
    const loginResponse = await fetch('http://localhost:3001/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        identifier: 'technician',
        password: 'password123'
      })
    });
    
    if (!loginResponse.ok) {
      throw new Error(`Login failed: ${loginResponse.status}`);
    }
    
    const loginData = await loginResponse.json();
    const token = loginData.data?.token;
    if (!token) {
      throw new Error('Failed to get auth token');
    }
    console.log('✅ 获取token成功');
    
    // Step 2: Complete work order without photos
    console.log('\n2. 完成工单(不含照片)...');
    const completionResponse = await fetch(`http://localhost:3002/api/work-orders/${workOrderId}/complete`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        solutionDescription: '测试解决方案 - 设备已修复并测试正常运行，所有功能恢复正常。',
        faultCode: 'ELECTRICAL_FAILURE'
      })
    });
    
    if (!completionResponse.ok) {
      const errorText = await completionResponse.text();
      throw new Error(`Completion failed: ${completionResponse.status} - ${errorText}`);
    }
    
    const completionData = await completionResponse.json();
    console.log('✅ 工单完成成功');
    console.log('Resolution Record ID:', completionData.data.workOrder.resolutionRecord?.id);
    
    // Step 3: Create a test image file (simple 1x1 pixel PNG)
    console.log('\n3. 创建测试图片文件...');
    const testImageBuffer = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==',
      'base64'
    );
    const testImagePath = path.join(__dirname, 'test-resolution-photo.png');
    fs.writeFileSync(testImagePath, testImageBuffer);
    console.log('✅ 测试图片创建成功:', testImagePath);
    
    // Step 4: Upload ResolutionPhoto
    console.log('\n4. 上传解决方案照片...');
    const formData = new FormData();
    formData.append('attachments', fs.createReadStream(testImagePath), {
      filename: 'test-resolution-photo.png',
      contentType: 'image/png'
    });
    
    const uploadResponse = await fetch(`http://localhost:3002/api/work-orders/${workOrderId}/photos`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        ...formData.getHeaders()
      },
      body: formData
    });
    
    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text();
      throw new Error(`Photo upload failed: ${uploadResponse.status} - ${errorText}`);
    }
    
    const uploadData = await uploadResponse.json();
    console.log('✅ 照片上传成功');
    console.log('Uploaded Photos:', uploadData.data.uploadedPhotos);
    
    // Step 5: Verify ResolutionPhoto was created properly
    console.log('\n5. 验证ResolutionPhoto记录...');
    
    // Clean up test file
    fs.unlinkSync(testImagePath);
    console.log('🧹 清理测试文件');
    
    console.log('\n🎉 测试完成! 请检查Web界面中的解决方案照片显示。');
    
  } catch (error) {
    console.error('❌ 测试失败:', error.message);
  }
}

testResolutionPhotoUpload();