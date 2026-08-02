import { config } from 'dotenv';
import * as argon2 from 'argon2';
import { PrismaPg } from '@prisma/adapter-pg';
import { CollectorOperationalStatus, PrismaClient, StaffRole, StaffStatus } from '../src/generated/prisma/client';
config({ path: '../../.env' }); config();
const normalizePhone = (value: string) => { const compact = value.trim().replace(/[ .()-]/g, ''); return compact.startsWith('+84') ? `0${compact.slice(3)}` : compact; };
async function main() {
  const databaseUrl = process.env.DATABASE_URL, email = process.env.BOOTSTRAP_COLLECTOR_EMAIL?.trim().toLowerCase(), password = process.env.BOOTSTRAP_COLLECTOR_PASSWORD, fullName = process.env.BOOTSTRAP_COLLECTOR_NAME?.trim(), employeeCode = process.env.BOOTSTRAP_COLLECTOR_EMPLOYEE_CODE?.trim().toUpperCase(), phone = process.env.BOOTSTRAP_COLLECTOR_PHONE?.trim();
  if (!databaseUrl || !email || !password || !fullName || !employeeCode || !phone) throw new Error('DATABASE_URL and all BOOTSTRAP_COLLECTOR_* variables are required.');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('Collector email is invalid.');
  if (!/^(?=.*[A-Za-z])(?=.*\d).{10,128}$/.test(password)) throw new Error('Collector password must be 10-128 characters and contain a letter and number.');
  if (!/^[A-Z0-9][A-Z0-9-]{1,49}$/.test(employeeCode)) throw new Error('Collector employee code is invalid.');
  const phoneNormalized = normalizePhone(phone); if (!/^0\d{9}$/.test(phoneNormalized)) throw new Error('Collector phone is invalid.');
  const prisma = new PrismaClient({ adapter: new PrismaPg(databaseUrl) });
  try {
    const existing = await prisma.collectorProfile.findFirst({ where: { OR: [{ employeeCode }, { staffUser: { email } }] }, select: { id: true } });
    if (existing) throw new Error('Collector email or employee code already exists; no changes were made.');
    const passwordHash = await argon2.hash(password, { type: argon2.argon2id });
    await prisma.$transaction(async (tx) => { const staff = await tx.staffUser.create({ data: { email, passwordHash, fullName, role: StaffRole.COLLECTOR, status: StaffStatus.ACTIVE } }); await tx.collectorProfile.create({ data: { staffUserId: staff.id, employeeCode, phone, phoneNormalized, operationalStatus: CollectorOperationalStatus.OFF_DUTY } }); });
    process.stdout.write(`Collector ${employeeCode} created successfully; phone ending ${phoneNormalized.slice(-4)}.\n`);
  } finally { await prisma.$disconnect(); }
}
main().catch((error: unknown) => { process.stderr.write(`${error instanceof Error ? error.message : 'Collector creation failed.'}\n`); process.exitCode = 1; });
