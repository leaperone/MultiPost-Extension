'use server';

import { auth } from '@/auth';
import { multipostDb } from '@/lib/db';
import { InputJsonValue } from '@prisma/client/runtime/library';

export async function savePlatformExtraConfig<T>(platform: string, data: T) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return {
        success: false,
        error: 'Authentication failed',
      };
    }

    const platformExtraConfig = await multipostDb.platformExtraConfig.create({
      data: {
        userId: session.user.id,
        platform,
        data: data as InputJsonValue,
      },
    });

    return {
      success: true,
      data: platformExtraConfig,
    };
  } catch (error) {
    return {
      success: false,
      error: 'Failed to save platform extra data',
    };
  }
}

export async function getPlatformExtraConfig<T>(platform: string): Promise<{
  success: boolean;
  data?: T;
  error?: string;
}> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return {
        success: false,
        error: 'Authentication failed',
      };
    }

    const platformExtraConfig = await multipostDb.platformExtraConfig.findUniqueOrThrow({
      where: {
        userId_platform: {
          userId: session.user.id,
          platform,
        },
      },
    });

    return {
      success: true,
      data: platformExtraConfig.data as T,
    };
  } catch (error) {
    return {
      success: false,
      error: 'Failed to get platform extra config',
    };
  }
}

export async function getPlatformExtraConfigList() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return {
        success: false,
        error: 'Authentication failed',
      };
    }

    const platformExtraConfigList = await multipostDb.platformExtraConfig.findMany({
      where: {
        userId: session.user.id,
      },
    });

    return {
      success: true,
      data: platformExtraConfigList,
    };
  } catch (error) {
    return {
      success: false,
      error: 'Failed to get platform extra config list',
    };
  }
}
