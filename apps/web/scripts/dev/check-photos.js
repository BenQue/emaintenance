const { PrismaClient } = require('@emaintenance/database');

const prisma = new PrismaClient();

async function checkPhotos() {
  try {
    console.log('🔍 Checking WorkOrderPhoto records in database...\n');
    
    const photos = await prisma.workOrderPhoto.findMany({
      include: {
        workOrder: {
          select: {
            id: true,
            title: true,
            status: true
          }
        }
      },
      orderBy: {
        uploadedAt: 'desc'
      }
    });
    
    console.log(`📊 Total WorkOrderPhoto records: ${photos.length}\n`);
    
    if (photos.length === 0) {
      console.log('❌ No photo records found in database');
      console.log('\n🔍 Let\'s check if there are any work orders with photos field...');
      
      const workOrdersWithPhotos = await prisma.workOrder.findMany({
        where: {
          NOT: {
            OR: [
              { attachments: { equals: [] } },
              { attachments: null }
            ]
          }
        },
        select: {
          id: true,
          title: true,
          attachments: true,
          createdAt: true
        }
      });
      
      console.log(`📋 Work orders with attachments: ${workOrdersWithPhotos.length}`);
      workOrdersWithPhotos.forEach((wo, index) => {
        console.log(`${index + 1}. ${wo.title} (${wo.id})`);
        console.log(`   Attachments: ${JSON.stringify(wo.attachments)}`);
        console.log(`   Created: ${wo.createdAt}`);
        console.log('---');
      });
    } else {
      photos.forEach((photo, index) => {
        console.log(`${index + 1}. Photo ID: ${photo.id}`);
        console.log(`   Work Order: ${photo.workOrder.title} (${photo.workOrder.id})`);
        console.log(`   Original Name: ${photo.originalName}`);
        console.log(`   File Path: ${photo.filePath}`);
        console.log(`   Thumbnail: ${photo.thumbnailPath || 'None'}`);
        console.log(`   File Size: ${photo.fileSize} bytes`);
        console.log(`   MIME Type: ${photo.mimeType}`);
        console.log(`   Uploaded: ${photo.uploadedAt}`);
        console.log('---');
      });
    }
    
  } catch (error) {
    console.error('❌ Error checking photos:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkPhotos();