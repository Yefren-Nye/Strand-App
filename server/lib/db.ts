import { PrismaClient } from '@prisma/client';

let _prisma: PrismaClient | null = null;

export function getDb(): PrismaClient {
  if (_prisma) return _prisma;
  _prisma = new PrismaClient();
  return _prisma;
}
