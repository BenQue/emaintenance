const { PrismaClient } = require('@emaintenance/database');

const prisma = new PrismaClient();

async function createTestPhoto() {
  try {
    console.log('🔍 Creating test photo record for existing work order...\n');
    
    // Get a work order that exists
    const workOrder = await prisma.workOrder.findFirst({
      where: {
        status: {
          in: ['PENDING', 'IN_PROGRESS']
        }
      }
    });
    
    if (!workOrder) {
      console.log('❌ No suitable work order found');
      return;
    }
    
    console.log(`📋 Using work order: ${workOrder.title} (${workOrder.id})`);
    
    // Check if photo already exists for this work order
    const existingPhoto = await prisma.workOrderPhoto.findFirst({
      where: { workOrderId: workOrder.id }
    });
    
    if (existingPhoto) {
      console.log('✅ Photo already exists for this work order');
      console.log(`   Photo ID: ${existingPhoto.id}`);
      console.log(`   Original Name: ${existingPhoto.originalName}`);
      return;
    }
    
    // Create a test photo record using the existing physical file
    const photoData = {
      workOrderId: workOrder.id,
      filename: 'cme78ah1k00015oy9uzxi9xzi-1754923751737-86956938.jpg', // Existing file
      originalName: 'test_equipment_fault.jpg',
      filePath: '2025/08/cme78ah1k00015oy9uzxi9xzi-1754923751737-86956938.jpg',
      thumbnailPath: '2025/08/thumbnails/thumb_cme78ah1k00015oy9uzxi9xzi-1754923751737-86956938.jpg',
      fileSize: 67716,
      mimeType: 'image/jpeg',
    };
    
    const createdPhoto = await prisma.workOrderPhoto.create({
      data: photoData
    });
    
    console.log('✅ Test photo record created successfully!');
    console.log(`   Photo ID: ${createdPhoto.id}`);
    console.log(`   Work Order: ${workOrder.title}`);
    console.log(`   Work Order ID: ${workOrder.id}`);
    console.log(`   Original Name: ${createdPhoto.originalName}`);
    console.log(`   File Path: ${createdPhoto.filePath}`);
    console.log(`   Upload Time: ${createdPhoto.uploadedAt}`);
    
    console.log('\n🔗 You can now view this work order in the PC interface to see the photo!');
    console.log(`   Work Order URL: http://localhost:3000/dashboard/work-orders/${workOrder.id}`);
    
  } catch (error) {
    console.error('❌ Error creating test photo:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createTestPhoto();