import { prisma } from '@/lib/db';
import { authKey } from '@/actions/authKey';
import { errorResponse, successResponse, unauthenticatedResponse } from '@/lib/response';
export async function GET(request: Request) {
  const { userId } = await authKey(request);
  if (!userId) {
    return unauthenticatedResponse();
  }

  const searchParams = new URL(request.url).searchParams;
  const clientId = searchParams.get('clientId');
  if (!clientId) {
    throw new Error('CLIENT_ID_REQUIRED');
  }

  try {
    const client = await prisma.extensionClient.findUnique({
      where: {
        id: clientId,
        userId,
        deletedAt: null,
      },
      select: {
        id: true,
        name: true,
        createdAt: true,
        updatedAt: true,
        platformInfos: true,
        deletedAt: true,
      },
    });
    if (!client) {
      throw new Error('CLIENT_NOT_FOUND');
    }
    return successResponse(client);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PUT(request: Request) {
  const { userId } = await authKey(request);
  if (!userId) {
    return unauthenticatedResponse();
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
    return successResponse(updatedClient);
  } catch (error) {
    return errorResponse(error);
  }
}
