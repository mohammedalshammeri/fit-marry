import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Attempting to fix database constraints...');
  try {
    // Try to drop the constraint that is blocking the index drop
    await prisma.$executeRawUnsafe(`ALTER TABLE "User" DROP CONSTRAINT IF EXISTS "User_activeConversationId_key";`);
    console.log('Successfully dropped "User_activeConversationId_key" constraint.');
  } catch (e) {
    console.error('Failed to drop constraint:', e);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
