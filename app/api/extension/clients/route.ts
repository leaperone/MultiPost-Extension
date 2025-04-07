import { prisma } from '@/lib/db';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { authKey } from '../common';

export async function GET(request: Request) {
  const { success, userId, error } = await authKey(request);
  if (!success || !userId) {
    return NextResponse.json({
      success: false,
      error,
    });
  }

  try {
    const clients = await prisma.extensionClient.findMany({
      where: {
        userId,
      },
      select: {
        id: true,
        name: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    return NextResponse.json({ success: true, data: clients });
  } catch (error) {
    console.error('Error fetching clients:', error);
    if (error instanceof z.ZodError) {
      return new NextResponse(error.errors[0].message, { status: 400 });
    }
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
