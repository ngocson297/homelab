import { config } from 'dotenv';
import * as argon2 from 'argon2';
import { PrismaPg } from '@prisma/adapter-pg';
import {
  PrismaClient,
  StaffRole,
  StaffStatus,
} from '../src/generated/prisma/client';

config({ path: '../../.env' });
config();

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PASSWORD_PATTERN = /^(?=.*[A-Za-z])(?=.*\d).{10,128}$/;

function maskEmail(email: string): string {
  const [localPart, domain] = email.split('@');
  const visibleLocal =
    localPart.length <= 2
      ? `${localPart[0] ?? ''}***`
      : `${localPart.slice(0, 2)}***${localPart.slice(-1)}`;
  return `${visibleLocal}@${domain}`;
}

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  const email = process.env.BOOTSTRAP_LAB_STAFF_EMAIL?.trim().toLowerCase();
  const password = process.env.BOOTSTRAP_LAB_STAFF_PASSWORD;
  const fullName = process.env.BOOTSTRAP_LAB_STAFF_NAME?.trim();

  if (!databaseUrl || !email || !password || !fullName) {
    throw new Error(
      'DATABASE_URL and all BOOTSTRAP_LAB_STAFF_* variables are required.',
    );
  }
  if (!EMAIL_PATTERN.test(email))
    throw new Error('Lab staff email is invalid.');
  if (!PASSWORD_PATTERN.test(password)) {
    throw new Error(
      'Lab staff password must be 10-128 characters and contain a letter and number.',
    );
  }

  const prisma = new PrismaClient({ adapter: new PrismaPg(databaseUrl) });
  try {
    const existing = await prisma.staffUser.findUnique({
      where: { email },
      select: { id: true },
    });
    if (existing) {
      throw new Error(
        'A staff account with this email already exists; no changes were made.',
      );
    }

    await prisma.staffUser.create({
      data: {
        email,
        passwordHash: await argon2.hash(password, { type: argon2.argon2id }),
        fullName,
        role: StaffRole.LAB_STAFF,
        status: StaffStatus.ACTIVE,
        passwordChangedAt: new Date(),
      },
    });
    process.stdout.write(
      `Lab staff account ${maskEmail(email)} created successfully with role ${StaffRole.LAB_STAFF}.\n`,
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  process.stderr.write(
    `${error instanceof Error ? error.message : 'Lab staff creation failed.'}\n`,
  );
  process.exitCode = 1;
});
