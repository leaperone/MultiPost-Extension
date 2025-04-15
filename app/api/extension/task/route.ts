import { prisma } from '@/lib/db';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { authKey } from '@/actions/authKey';
import { taskSchema, TaskStatus } from '../types';

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
    const validatedData = taskSchema.parse(body);

    const client = await prisma.extensionClient.findUnique({
      where: {
        id: validatedData.targetClientId,
        userId,
      },
    });
    if (!client) {
      return NextResponse.json({
        success: false,
        error: 'CLIENT_NOT_FOUND',
      });
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
    return NextResponse.json({
      success: true,
      data: {
        taskId: task.id,
        status: task.status,
      },
    });
  } catch (error) {
    console.error('Error creating task:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: 'INVALID_DATA',
          details: error.errors,
        },
        { status: 400 },
      );
    }
    return NextResponse.json(
      {
        success: false,
        error: 'INTERNAL_SERVER_ERROR',
      },
      { status: 500 },
    );
  }
}

export async function GET(request: Request) {
  const { success, userId, error } = await authKey(request);
  if (!success || !userId) {
    return NextResponse.json({
      success: false,
      error,
    });
  }

  const searchParams = new URL(request.url).searchParams;
  const taskId = searchParams.get('taskId');
  if (!taskId) {
    return NextResponse.json({
      success: false,
      error: 'TASK_ID_REQUIRED',
    });
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
    return NextResponse.json({
      success: true,
      data: task,
    });
  } catch (error) {
    console.error('Error fetching task:', error);
    if (error instanceof z.ZodError) {
      return new NextResponse(error.errors[0].message, { status: 400 });
    }
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
