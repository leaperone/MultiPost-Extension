import { createServerFn } from '@tanstack/react-start';
import { PlatformExtraConfig } from '@db/schema/schema';
import type { JsonValue } from '@db/helpers';
import { and, eq } from 'drizzle-orm';
import { z } from 'zod';

import { db } from '../../lib/db';
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

      const [platformExtraConfig] = await db
        .insert(PlatformExtraConfig)
        .values({
          userId: session.user.id,
          platform: data.platform,
          data: data.data as JsonValue,
        })
        .onConflictDoUpdate({
          target: [PlatformExtraConfig.userId, PlatformExtraConfig.platform],
          set: {
            data: data.data as JsonValue,
            updatedAt: new Date(),
          },
        })
        .returning();

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

      const [platformExtraConfig] = await db
        .select()
        .from(PlatformExtraConfig)
        .where(
          and(
            eq(PlatformExtraConfig.userId, session.user.id),
            eq(PlatformExtraConfig.platform, data.platform),
          ),
        )
        .limit(1);

      if (!platformExtraConfig) {
        throw new Error('Platform extra config not found');
      }

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

      const platformExtraConfigList = await db
        .select()
        .from(PlatformExtraConfig)
        .where(eq(PlatformExtraConfig.userId, session.user.id));

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
