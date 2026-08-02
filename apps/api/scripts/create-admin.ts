import { config } from 'dotenv';
import * as argon2 from 'argon2';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient, StaffRole, StaffStatus } from '../src/generated/prisma/client';

config({ path: '../../.env' });
config();

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  const email = process.env.BOOTSTRAP_ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.BOOTSTRAP_ADMIN_PASSWORD;
  const fullName = process.env.BOOTSTRAP_ADMIN_NAME?.trim();
  if (!databaseUrl || !email || !password || !fullName) throw new Error('DATABASE_URL and all BOOTSTRAP_ADMIN_* variables are required.');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('Admin email is invalid.');
  if (!/^(?=.*[A-Za-z])(?=.*\d).{10,128}$/.test(password)) throw new Error('Admin password must be 10-128 characters and contain a letter and number.');
  const prisma = new PrismaClient({ adapter: new PrismaPg(databaseUrl) });
  try {
    if (await prisma.staffUser.findUnique({ where: { email }, select: { id: true } })) throw new Error('A staff account with this email already exists; no changes were made.');
    await prisma.staffUser.create({ data: { email, passwordHash: await argon2.hash(password, { type: argon2.argon2id }), fullName, role: StaffRole.ADMIN, status: StaffStatus.ACTIVE } });
    process.stdout.write('Admin account created successfully.\n');
  } finally { await prisma.$disconnect(); }
}

main().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.message : 'Admin creation failed.'}\n`);
  process.exitCode = 1;
});
