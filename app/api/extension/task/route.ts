import { prisma } from '@/lib/db';
import { authKey } from '@/actions/authKey';
import { taskSchema, TaskStatus } from '../types';
import { errorResponse, successResponse, unauthenticatedResponse } from '@/lib/response';

export async function POST(request: Request) {
  const { userId } = await authKey(request);
  if (!userId) {
    return unauthenticatedResponse();
  }

  try {
    const body = await request.json();
    const validatedData = taskSchema.parse(body);

    const client = await prisma.extensionClient.findUnique({
      where: {
        id: validatedData.targetClientId,
        userId,
      },
    });
    if (!client) {
      throw new Error('CLIENT_NOT_FOUND');
    }

    const task = await prisma.extensionTask.create({
      data: {
        userId,
        targetClientId: validatedData.targetClientId,
        taskType: validatedData.taskType,
        taskData: body.taskData,
        status: TaskStatus.PENDING,
      },
    });
    return successResponse({
      taskId: task.id,
      status: task.status,
    });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function GET(request: Request) {
  const { userId } = await authKey(request);
  if (!userId) {
    return unauthenticatedResponse();
  }

  const searchParams = new URL(request.url).searchParams;
  const taskId = searchParams.get('taskId');
  if (!taskId) {
    throw new Error('TASK_ID_REQUIRED');
  }
  try {
    const task = await prisma.extensionTask.findUnique({
      where: {
        id: taskId,
        userId,
      },
      select: {
        id: true,
        taskType: true,
        status: true,
        targetClientId: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    return successResponse(task);
  } catch (error) {
    return errorResponse(error);
  }
}
