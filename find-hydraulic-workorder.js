const { PrismaClient } = require('@emaintenance/database');
const prisma = new PrismaClient();

async function findWorkOrder() {
  try {
    const workOrder = await prisma.workOrder.findFirst({
      where: {
        title: { contains: '液压系统压力异常' }
      },
      include: {
        resolutionRecord: {
          include: {
            photos: true
          }
        }
      }
    });
    
    if (workOrder) {
      console.log('🔍 找到工单:', workOrder.id, '-', workOrder.title);
      console.log('状态:', workOrder.status);
      console.log('完成时间:', workOrder.completedAt);
      
      if (workOrder.resolutionRecord) {
        console.log('\n✅ 解决方案记录存在:');
        console.log('ID:', workOrder.resolutionRecord.id);
        console.log('解决方案:', workOrder.resolutionRecord.solutionDescription);
        console.log('解决方案照片数量:', workOrder.resolutionRecord.photos.length);
        
        if (workOrder.resolutionRecord.photos.length > 0) {
          console.log('\n📷 解决方案照片:');
          workOrder.resolutionRecord.photos.forEach((photo, i) => {
            console.log(`${i+1}. 名称: ${photo.name || '无名称'}`);
            console.log(`   URL: ${photo.url || '无URL'}`);
            console.log(`   大小: ${photo.size || '未知'}`);
            console.log(`   类型: ${photo.mimeType || '未知'}`);
            console.log(`   上传时间: ${photo.createdAt}`);
          });
        } else {
          console.log('\n❌ 没有解决方案照片');
        }
      } else {
        console.log('\n❌ 无解决方案记录');
      }
    } else {
      console.log('❌ 未找到该工单');
    }
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

findWorkOrder();