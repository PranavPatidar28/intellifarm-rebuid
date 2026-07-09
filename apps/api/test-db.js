const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const records = await prisma.marketRecord.findMany({ select: { mandiName: true, district: true, state: true }, distinct: ['mandiName', 'district', 'state'] });
  console.log(records.slice(0, 20));
}

main().finally(() => prisma.$disconnect());
