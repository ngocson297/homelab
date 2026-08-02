import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient, LabTestStatus, Prisma } from '../src/generated/prisma/client';

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error('DATABASE_URL is required to seed the database');
}

const prisma = new PrismaClient({ adapter: new PrismaPg(databaseUrl) });

const labTests: Prisma.LabTestCreateManyInput[] = [
  {
    code: 'CBC',
    name: 'Complete Blood Count',
    description: 'Measures major blood cell groups.',
    specimenType: 'Whole blood',
    containerType: 'EDTA tube',
    minimumVolumeMl: '2.00',
    preparationInstruction: null,
    turnaroundTimeHours: 24,
    homeCollectable: true,
    price: '150000.00',
    status: LabTestStatus.ACTIVE,
  },
  {
    code: 'GLU-FAST',
    name: 'Fasting Blood Glucose',
    description: 'Measures fasting blood glucose concentration.',
    specimenType: 'Serum',
    containerType: 'Serum separator tube',
    minimumVolumeMl: '1.00',
    preparationInstruction: 'Fast for 8 hours; water is permitted.',
    turnaroundTimeHours: 12,
    homeCollectable: true,
    price: '90000.00',
    status: LabTestStatus.ACTIVE,
  },
  {
    code: 'HBA1C',
    name: 'Hemoglobin A1c',
    description: 'Measures average blood glucose over recent months.',
    specimenType: 'Whole blood',
    containerType: 'EDTA tube',
    minimumVolumeMl: '2.00',
    preparationInstruction: null,
    turnaroundTimeHours: 24,
    homeCollectable: true,
    price: '220000.00',
    status: LabTestStatus.ACTIVE,
  },
  {
    code: 'LIPID',
    name: 'Lipid Profile',
    description: 'Measures cholesterol and triglyceride components.',
    specimenType: 'Serum',
    containerType: 'Serum separator tube',
    minimumVolumeMl: '1.50',
    preparationInstruction: 'Follow the preparation advice provided at booking.',
    turnaroundTimeHours: 24,
    homeCollectable: true,
    price: '280000.00',
    status: LabTestStatus.ACTIVE,
  },
  {
    code: 'ALT',
    name: 'Alanine Aminotransferase',
    description: 'Measures alanine aminotransferase activity.',
    specimenType: 'Serum',
    containerType: 'Serum separator tube',
    minimumVolumeMl: '1.00',
    preparationInstruction: null,
    turnaroundTimeHours: 24,
    homeCollectable: true,
    price: '110000.00',
    status: LabTestStatus.ACTIVE,
  },
  {
    code: 'CREA',
    name: 'Creatinine',
    description: 'Measures creatinine concentration in serum.',
    specimenType: 'Serum',
    containerType: 'Serum separator tube',
    minimumVolumeMl: '1.00',
    preparationInstruction: null,
    turnaroundTimeHours: 24,
    homeCollectable: true,
    price: '100000.00',
    status: LabTestStatus.ACTIVE,
  },
  {
    code: 'TSH',
    name: 'Thyroid Stimulating Hormone',
    description: 'Measures thyroid stimulating hormone concentration.',
    specimenType: 'Serum',
    containerType: 'Serum separator tube',
    minimumVolumeMl: '1.00',
    preparationInstruction: null,
    turnaroundTimeHours: 36,
    homeCollectable: true,
    price: '250000.00',
    status: LabTestStatus.ACTIVE,
  },
  {
    code: 'URINALYSIS',
    name: 'Routine Urinalysis',
    description: 'Physical and chemical screening of a urine specimen.',
    specimenType: 'Urine',
    containerType: 'Sterile urine container',
    minimumVolumeMl: '20.00',
    preparationInstruction: 'Use the provided sterile collection container.',
    turnaroundTimeHours: 24,
    homeCollectable: true,
    price: '120000.00',
    status: LabTestStatus.ACTIVE,
  },
  {
    code: 'PT-INR',
    name: 'Prothrombin Time and INR',
    description: 'Measures blood clotting time.',
    specimenType: 'Citrated plasma',
    containerType: 'Sodium citrate tube',
    minimumVolumeMl: '2.70',
    preparationInstruction: null,
    turnaroundTimeHours: 12,
    homeCollectable: false,
    price: '180000.00',
    status: LabTestStatus.ACTIVE,
  },
  {
    code: 'VITD',
    name: 'Vitamin D',
    description: 'Measures total 25-hydroxy vitamin D.',
    specimenType: 'Serum',
    containerType: 'Serum separator tube',
    minimumVolumeMl: '1.00',
    preparationInstruction: null,
    turnaroundTimeHours: 48,
    homeCollectable: false,
    price: '450000.00',
    status: LabTestStatus.INACTIVE,
  },
];

async function main(): Promise<void> {
  await prisma.labTest.createMany({ data: labTests, skipDuplicates: true });
}

main()
  .catch(() => {
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
