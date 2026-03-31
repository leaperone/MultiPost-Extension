import { prisma } from '@/lib/db';
import { authKey } from '@/actions/authKey';
import { errorResponse, successResponse, unauthenticatedResponse } from '@/lib/response';
export async function GET(request: Request) {
  const { userId } = await authKey(request);
  if (!userId) {
    return unauthenticatedResponse();
  }

  try {
    const clients = await prisma.extensionClient.findMany({
      where: {
        userId,
        deletedAt: null,
      },
      select: {
        id: true,
        name: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    return successResponse(clients);
  } catch (error) {
    return errorResponse(error);
  }
}
