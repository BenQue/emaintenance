// Check if resolution photos were created and can be retrieved
const { PrismaClient } = require('@emaintenance/database');

const prisma = new PrismaClient();

async function checkResolutionPhotos() {
  try {
    const workOrderId = 'cme79ikia000d5oy9b8thigvh';
    
    console.log('🔍 检查解决方案记录和相关照片...');
    console.log('Work Order ID:', workOrderId);
    
    // Get the work order with resolution record
    const workOrder = await prisma.workOrder.findUnique({
      where: { id: workOrderId },
      include: {
        resolutionRecord: {
          include: {
            photos: true,
          }
        }
      }
    });

    if (!workOrder) {
      console.log('❌ 工单不存在');
      return;
    }

    console.log('\n📄 工单信息:');
    console.log(`标题: ${workOrder.title}`);
    console.log(`状态: ${workOrder.status}`);
    console.log(`完成时间: ${workOrder.completedAt}`);

    if (workOrder.resolutionRecord) {
      console.log('\n✅ 解决方案记录存在:');
      console.log(`ID: ${workOrder.resolutionRecord.id}`);
      console.log(`解决方案: ${workOrder.resolutionRecord.solutionDescription}`);
      console.log(`故障代码: ${workOrder.resolutionRecord.faultCode}`);
      console.log(`完成时间: ${workOrder.resolutionRecord.completedAt}`);
      
      console.log('\n📷 解决方案照片:');
      if (workOrder.resolutionRecord.photos.length === 0) {
        console.log('❌ 没有解决方案照片');
      } else {
        workOrder.resolutionRecord.photos.forEach((photo, index) => {
          console.log(`${index + 1}. ${photo.name} (${photo.url})`);
        });
      }
    } else {
      console.log('\n❌ 解决方案记录不存在');
    }

    // Also check WorkOrderPhoto table for report photos
    console.log('\n📷 报修照片 (WorkOrderPhoto):');
    const reportPhotos = await prisma.workOrderPhoto.findMany({
      where: { workOrderId }
    });
    
    if (reportPhotos.length === 0) {
      console.log('❌ 没有报修照片');
    } else {
      reportPhotos.forEach((photo, index) => {
        console.log(`${index + 1}. ID: ${photo.id}, Name: ${photo.name || '无名称'}, URL: ${photo.url || '无URL'}, Size: ${photo.size || '未知'}, MimeType: ${photo.mimeType || '未知'}`);
      });
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkResolutionPhotos();