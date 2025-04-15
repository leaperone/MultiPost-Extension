import { prisma } from '@/lib/db';
import { nanoid } from 'nanoid';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { authKey } from '@/actions/authKey';
import { taskNeedToHandle } from '../common';
import { BASE_URL } from '@/lib/constants';

const schema = z.object({
  extensionClientId: z.string().optional(),
  platformInfos: z.any().optional(),
  extensionVersion: z.string().optional(),
});

export async function POST(request: Request) {
  const { success, userId, error } = await authKey(request);
  if (!success || !userId) {
    return NextResponse.json({
      success: false,
      error,
    });
  }

  try {
    const body = await request.json();
    const { extensionClientId, platformInfos, extensionVersion } = schema.parse(body);

    if (!extensionClientId) {
      const newClient = await prisma.extensionClient.create({
        data: {
          userId,
          name: `New Client ${nanoid(8)}`,
          platformInfos: {},
          extensionVersion,
        },
      });
      return NextResponse.json({
        success: true,
        data: {
          action: 'NEW_CLIENT',
          clientId: newClient.id,
        },
      });
    }

    const client = await prisma.extensionClient.findUnique({
      where: {
        id: extensionClientId,
        userId,
      },
    });
    if (!client) {
      return NextResponse.json({
        success: false,
        error: 'CLIENT_NOT_FOUND',
      });
    }

    await prisma.extensionClient.update({
      where: {
        id: extensionClientId,
      },
      data: {
        extensionVersion,
        updatedAt: new Date(),
      },
    });

    if (platformInfos) {
      await prisma.extensionClient.update({
        where: {
          id: extensionClientId,
        },
        data: {
          extensionVersion,
          platformInfos,
        },
      });
      return NextResponse.json({
        success: true,
        data: {
          action: 'UPDATE_PLATFORM_INFOS',
        },
      });
    }

    const task = await taskNeedToHandle(extensionClientId);

    if (task) {
      return NextResponse.json({
        success: true,
        data: {
          action: 'NEW_TASK',
          url: `${BASE_URL}/on-task?taskId=${task.id}`,
        },
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        action: 'PING_SUCCESS',
      },
    });
  } catch (error) {
    console.error('Error creating API key:', error);
    if (error instanceof z.ZodError) {
      return new NextResponse(error.errors[0].message, { status: 400 });
    }
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
