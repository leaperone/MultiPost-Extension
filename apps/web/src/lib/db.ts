import path from 'node:path';
import { createRequire } from 'node:module';

type PrismaClientConstructor = (typeof import('@/prisma/client_multipost'))['PrismaClient'];
type PrismaMultipostClient = InstanceType<PrismaClientConstructor>;

const require = createRequire(import.meta.url);
const prismaClientPath = path.resolve(process.cwd(), '../../prisma/client_multipost');
const { PrismaClient: PrismaMultipostClient } = require(prismaClientPath) as {
  PrismaClient: PrismaClientConstructor;
};

const globalForPrisma = globalThis as typeof globalThis & {
  prismaMultipostGlobal?: PrismaMultipostClient;
};

const createMultipostClient = () => new PrismaMultipostClient();

export const multipostDb = globalForPrisma.prismaMultipostGlobal ?? createMultipostClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prismaMultipostGlobal = multipostDb;
}

export const prisma = multipostDb;
