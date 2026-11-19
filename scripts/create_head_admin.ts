/** Add a separate Admin account without changing existing Owner credentials. */
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { randomBytes } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
async function main() {
  const password = process.env.ADMIN_INITIAL_PASSWORD || randomBytes(15).toString('base64url') + '!9a';
  const companies = JSON.parse(readFileSync('prisma/companies.json', 'utf8')) as { name: string; dbFile: string }[];
  const passwordHash = await bcrypt.hash(password, 12);
  let created = 0;
  for (const company of companies) {
    const db = new PrismaClient({ datasourceUrl: 'file:' + resolve('prisma', company.dbFile) });
    try {
      const existing = await db.user.findUnique({ where: { email: 'admin@rasaaruna.com' } });
      if (existing) { console.log(`${company.name}: akun Admin sudah ada; tidak diubah.`); continue; }
      await db.user.create({ data: { name: 'Admin', email: 'admin@rasaaruna.com', passwordHash, role: 'HEAD_ADMIN', active: true } });
      created++;
      console.log(`${company.name}: Admin ditambahkan.`);
    } finally { await db.$disconnect(); }
  }
  if (created) console.log(`Email: admin@rasaaruna.com\nPassword awal: ${password}`);
}
main().catch(e => { console.error(e.message); process.exitCode = 1; });
