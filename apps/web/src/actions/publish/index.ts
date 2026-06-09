import { createServerFn } from '@tanstack/react-start';
import type { InputJsonValue } from '@prisma/client/runtime/library';
import { z } from 'zod';

import { multipostDb } from '../../lib/db';
import { getSession } from '../../lib/session';

const platformExtraConfigSchema = z.object({
  platform: z.string().min(1),
  data: z.unknown(),
});

const platformSchema = z.object({
  platform: z.string().min(1),
});

export const savePlatformExtraConfig = createServerFn({ method: 'POST' })
  .validator(platformExtraConfigSchema)
  .handler(async ({ data }) => {
    try {
      const session = await getSession();
      if (!session?.user?.id) {
        return {
          success: false,
          error: 'Authentication failed',
        };
      }

      const platformExtraConfig = await multipostDb.platformExtraConfig.upsert({
        where: {
          userId_platform: {
            userId: session.user.id,
            platform: data.platform,
          },
        },
        update: {
          data: data.data as InputJsonValue,
        },
        create: {
          userId: session.user.id,
          platform: data.platform,
          data: data.data as InputJsonValue,
        },
      });

      return {
        success: true,
        data: platformExtraConfig,
      };
    } catch {
      return {
        success: false,
        error: 'Failed to save platform extra data',
      };
    }
  });

export const getPlatformExtraConfig = createServerFn({ method: 'GET' })
  .validator(platformSchema)
  .handler(async ({ data }) => {
    try {
      const session = await getSession();
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
            platform: data.platform,
          },
        },
      });

      return {
        success: true,
        data: platformExtraConfig.data,
      };
    } catch {
      return {
        success: false,
        error: 'Failed to get platform extra config',
      };
    }
  });

export const getPlatformExtraConfigList = createServerFn({ method: 'GET' })
  .validator(z.object({}))
  .handler(async () => {
    try {
      const session = await getSession();
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
    } catch {
      return {
        success: false,
        error: 'Failed to get platform extra config list',
      };
    }
  });
