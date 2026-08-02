import {
  Injectable,
  OnModuleDestroy,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { Prisma, PrismaClient } from '../generated/prisma/client';

@Injectable()
export class PrismaService implements OnModuleDestroy {
  private client?: PrismaClient;

  constructor(private readonly configService: ConfigService) {}

  get labTest(): PrismaClient['labTest'] {
    return this.getClient().labTest;
  }

  get order(): PrismaClient['order'] {
    return this.getClient().order;
  }

  get staffUser(): PrismaClient['staffUser'] {
    return this.getClient().staffUser;
  }

  get staffSession(): PrismaClient['staffSession'] {
    return this.getClient().staffSession;
  }

  get adminAuditLog(): PrismaClient['adminAuditLog'] {
    return this.getClient().adminAuditLog;
  }

  transaction<T>(
    operation: (transaction: Prisma.TransactionClient) => Promise<T>,
  ): Promise<T> {
    return this.getClient().$transaction(operation);
  }

  private getClient(): PrismaClient {
    if (this.client) return this.client;

    const databaseUrl = this.configService.get<string>('DATABASE_URL');
    if (!databaseUrl) {
      throw new ServiceUnavailableException('Database is not configured');
    }

    this.client = new PrismaClient({ adapter: new PrismaPg(databaseUrl) });
    return this.client;
  }

  async onModuleDestroy(): Promise<void> {
    await this.client?.$disconnect();
  }
}
