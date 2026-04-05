const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const rs = await prisma.$executeRawUnsafe(`
    UPDATE _prisma_migrations
    SET checksum = '436125274cd9d7cc4124c499499cc8d6de009ad395542a4a758e979cb6658483'
    WHERE migration_name = '20260209111715_update_schema_new_rules'
  `);
  console.log('Update result:', rs);
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
