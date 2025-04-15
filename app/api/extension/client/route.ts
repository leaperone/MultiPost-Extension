import { prisma } from '@/lib/db';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { authKey } from '@/actions/authKey';

export async function GET(request: Request) {
  const { success, userId, error } = await authKey(request);
  if (!success || !userId) {
    return NextResponse.json({
      success: false,
      error,
    });
  }

  const searchParams = new URL(request.url).searchParams;
  const clientId = searchParams.get('clientId');
  if (!clientId) {
    return NextResponse.json({
      success: false,
      error: 'CLIENT_ID_REQUIRED',
    });
  }

  try {
    const client = await prisma.extensionClient.findUnique({
      where: {
        id: clientId,
        userId,
      },
      select: {
        id: true,
        name: true,
        createdAt: true,
        updatedAt: true,
        platformInfos: true,
      },
    });
    if (!client) {
      return NextResponse.json({
        success: false,
        error: 'CLIENT_NOT_FOUND',
      });
    }
    return NextResponse.json({
      success: true,
      data: client,
    });
  } catch (error) {
    console.error('Error fetching client:', error);
    if (error instanceof z.ZodError) {
      return new NextResponse(error.errors[0].message, { status: 400 });
    }
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

export async function PUT(request: Request) {
  const { success, userId, error } = await authKey(request);
  if (!success || !userId) {
    return NextResponse.json({
      success: false,
      error,
    });
  }

  try {
    const body = await request.json();
    const { clientId, name } = body;
    const updatedClient = await prisma.extensionClient.update({
      where: {
        id: clientId,
        userId,
      },
      data: {
        name,
      },
    });
    return NextResponse.json({
      success: true,
      data: updatedClient,
    });
  } catch (error) {
    console.error('Error updating client:', error);
    return NextResponse.json({
      success: false,
      error: 'INTERNAL_SERVER_ERROR',
    });
  }
}
