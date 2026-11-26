import { lstatSync, readFileSync, realpathSync } from 'node:fs';
import path from 'node:path';
import { PrismaClient, Role } from '@prisma/client';
import { executeSeed } from '../src/lib/seedData';

async function main() {
  const cwd = realpathSync(process.cwd());
  const target = path.join(cwd, 'prisma/erp.db');
  const marker = JSON.parse(readFileSync('.erp-grading-demo.json', 'utf8'));
  const password = process.env.DEMO_GRADING_SEED_PASSWORD;
  if (!path.basename(cwd).startsWith('rasa-aruna-grading-') ||
      marker.environment !== 'grading-demo' || marker.database !== 'prisma/erp.db' ||
      process.env.DATABASE_URL !== 'file:' + target || realpathSync(target) !== target ||
      lstatSync(target).nlink !== 1 || !password || password.length < 20 ||
      process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME) {
    throw new Error('Seeder hanya menerima database demo yang dibuat oleh prepare_grading_demo.py.');
  }
  const client = new PrismaClient({ datasourceUrl: 'file:' + target });
  try {
    const counts = await client.$queryRaw<Array<{ players: bigint }>>`
      SELECT (SELECT COUNT(*) FROM User) + (SELECT COUNT(*) FROM ProductVariant) +
        (SELECT COUNT(*) FROM JournalEntry) + (SELECT COUNT(*) FROM Contact) +
        (SELECT COUNT(*) FROM StockLevel) AS players
    `;
    if (Number(counts[0].players) !== 0) throw new Error('Baseline sudah terisi. Buat folder demo baru untuk latihan berikutnya.');
    await executeSeed(client, 'Grading demo fixture', Role.HEAD_ADMIN, password);
  } finally {
    await client.$disconnect();
  }
}

main().catch(error => { console.error(error.message); process.exitCode = 1; });
