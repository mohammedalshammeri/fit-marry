const crypto = require('crypto');
const fs = require('fs');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const content = fs.readFileSync('prisma/migrations/20260209111715_update_schema_new_rules/migration.sql', 'utf8');
  const ch = crypto.createHash('sha256').update(content).digest('hex');
  const rs = await prisma.$executeRawUnsafe(`
    UPDATE _prisma_migrations
    SET checksum = '${ch}'
    WHERE migration_name = '20260209111715_update_schema_new_rules'
  `);
  console.log('Update result:', rs, 'Checksum:', ch);
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
