const { PrismaClient } = require('@emaintenance/database');
const prisma = new PrismaClient();

async function checkResolutionData() {
  try {
    const workOrder = await prisma.workOrder.findUnique({
      where: { id: 'wo_1755008549290' },
      include: {
        resolutionRecord: {
          include: {
            photos: true,
            resolvedBy: true
          }
        }
      }
    });
    
    if (!workOrder) {
      console.log('❌ 工单不存在');
      return;
    }
    
    console.log('📋 工单信息:');
    console.log('ID:', workOrder.id);
    console.log('标题:', workOrder.title);
    console.log('状态:', workOrder.status);
    
    if (workOrder.resolutionRecord) {
      console.log('\n✅ 解决方案记录:');
      console.log('ID:', workOrder.resolutionRecord.id);
      console.log('解决方案:', workOrder.resolutionRecord.solutionDescription.substring(0, 50) + '...');
      console.log('故障代码:', workOrder.resolutionRecord.faultCode);
      console.log('解决人:', `${workOrder.resolutionRecord.resolvedBy.firstName} ${workOrder.resolutionRecord.resolvedBy.lastName}`);
      
      console.log('\n📷 ResolutionPhotos:', workOrder.resolutionRecord.photos.length, '张');
      workOrder.resolutionRecord.photos.forEach((photo, i) => {
        console.log(`  ${i+1}. ${photo.originalName} (${photo.filePath})`);
      });
      
      console.log('\n🌐 测试建议:');
      console.log('1. 打开浏览器访问 http://localhost:3005 (或适当端口)');
      console.log('2. 登录技术员账户 (technician / password123)');  
      console.log('3. 找到工单:', workOrder.title);
      console.log('4. 检查解决方案记录中的完成照片预览功能');
      console.log('5. 检查右侧栏维修完成照片显示');
      
    } else {
      console.log('\n❌ 没有解决方案记录');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkResolutionData();