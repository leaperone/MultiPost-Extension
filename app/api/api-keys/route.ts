import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { nanoid } from 'nanoid';
import { z } from 'zod';

const createApiKeySchema = z.object({
  name: z.string().min(1, '名称不能为空').max(100, '名称不能超过100个字符'),
});

function maskApiKey(key: string): string {
  if (!key) return '';
  const start = key.slice(0, 8);
  const end = key.slice(-8);
  return `${start}********************${end}`;
}

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const apiKeys = await prisma.aPIKey.findMany({
      where: {
        userId: session.user.id,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // 遮罩 API Keys
    const maskedApiKeys = apiKeys.map((key) => ({
      ...key,
      key: maskApiKey(key.key),
    }));

    return NextResponse.json(maskedApiKeys);
  } catch (error) {
    console.error('Error fetching API keys:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const body = await request.json();
    const { name } = createApiKeySchema.parse(body);

    const newApiKey = await prisma.aPIKey.create({
      data: {
        userId: session.user.id,
        name,
        key: `mp-${nanoid(32)}`, // 生成一个带前缀的随机 API Key
      },
    });

    return NextResponse.json(newApiKey);
  } catch (error) {
    console.error('Error creating API key:', error);
    if (error instanceof z.ZodError) {
      return new NextResponse(error.errors[0].message, { status: 400 });
    }
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
