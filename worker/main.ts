import Fastify from 'fastify';
import { PrismaClient as PrismaMultipostClient } from '../prisma/client_multipost';
import { OpenAI } from 'openai';
import { config } from 'dotenv';
import { resolve } from 'path';
import { recovryReceivedImageGeneration, registerImageGenerationRoute } from './image';
import cron from 'node-cron';
import { processMinimumConsumption } from './minimum-consumption';

// 加载环境变量
config({
  path: resolve(process.cwd(), '.env.local'),
});

// 创建客户端单例
const createMultipostClient = () => new PrismaMultipostClient();

// 初始化客户端实例
const multipostDb = createMultipostClient();

const openai = new OpenAI({
  apiKey: process.env.TUZI_API_KEY,
  baseURL: process.env.TUZI_BASE_URL,
});

const app = Fastify();

// 注册图片生成相关的路由
registerImageGenerationRoute(app, multipostDb, openai);

const PORT = 8080;

const start = async () => {
  try {
    await recovryReceivedImageGeneration(multipostDb, openai);

    // 安排最低消费检查任务
    // cron 表达式: '分 时 日 月 周几'
    // '5 0 1 * *' 表示每月1号的00:05执行
    cron.schedule('5 0 1 * *', () => {
      console.log('Running scheduled job: processMinimumConsumption');
      processMinimumConsumption(multipostDb).catch((error) => {
        console.error('Error during scheduled job processMinimumConsumption:', error);
      });
    });

    await app.listen({ port: PORT });
    console.log(`服务器正在监听端口 ${PORT}`);
  } catch (err) {
    console.error('启动服务或安排任务时出错:', err);
    process.exit(1);
  }
};

start();

// 优雅关闭服务器
process.on('SIGTERM', async () => {
  console.log('收到 SIGTERM 信号，正在关闭服务器...');
  await app.close();
  console.log('服务器已关闭');
  process.exit(0);
});
