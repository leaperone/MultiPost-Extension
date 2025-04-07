import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';

interface Params {
  id: string;
}

export async function DELETE(request: Request, { params }: { params: Promise<Params> }) {
  const resolvedParams = await params;
  const id = resolvedParams.id;

  try {
    const session = await auth();
    if (!session?.user?.id) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    // 确保只能删除自己的 API Key
    const apiKey = await prisma.aPIKey.findFirst({
      where: {
        id: id,
        userId: session.user.id,
      },
    });

    if (!apiKey) {
      return new NextResponse('Not Found', { status: 404 });
    }

    await prisma.aPIKey.delete({
      where: {
        id: id,
      },
    });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error('Error deleting API key:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
