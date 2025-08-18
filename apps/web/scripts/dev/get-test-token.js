const { PrismaClient } = require('@emaintenance/database');

const prisma = new PrismaClient();

async function getTestUser() {
  try {
    const users = await prisma.user.findMany({
      take: 5,
      select: {
        id: true,
        username: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        isActive: true,
      }
    });

    console.log('Available test users:');
    users.forEach((user, index) => {
      console.log(`${index + 1}. ${user.firstName} ${user.lastName} (${user.username})`);
      console.log(`   Email: ${user.email}`);
      console.log(`   Role: ${user.role}`);
      console.log(`   Active: ${user.isActive}`);
      console.log(`   ID: ${user.id}`);
      console.log('');
    });

    if (users.length > 0) {
      console.log('To get a JWT token, use one of these users with the login endpoint:');
      console.log('POST http://localhost:3001/api/auth/login');
      console.log('Body: { "username": "username", "password": "password123" }');
    }

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

getTestUser();