import { PrismaClient as PrismaMultipostClient } from '@/prisma/client_multipost';

// 全局类型声明
declare const globalThis: {
  prismaMultipostGlobal: ReturnType<typeof createMultipostClient>;
} & typeof global;

// 创建客户端单例
const createMultipostClient = () => new PrismaMultipostClient();

// 初始化客户端实例
export const multipostDb = globalThis.prismaMultipostGlobal ?? createMultipostClient();

// 开发环境下保存全局实例
if (process.env.NODE_ENV !== 'production') {
  globalThis.prismaMultipostGlobal = multipostDb;
}

export const prisma = multipostDb;
