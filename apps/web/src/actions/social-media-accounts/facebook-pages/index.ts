import { createServerFn } from '@tanstack/react-start';
import { nanoid } from 'nanoid';
import { z } from 'zod';

import { prisma } from '@/lib/db';
import { getSession } from '../../../lib/session';
import {
  FACEBOOK_CONFIG,
  type FacebookPageDetails,
  type FacebookPageSummary,
  generateFacebookAuthUrl,
  getFacebookPageDetails,
  getFacebookUserPages,
} from './oauth';

const FACEBOOK_USER_PLATFORM = 'facebook';
const FACEBOOK_PAGE_PLATFORM = 'facebook-pages';

const accountIdSchema = z.object({
  accountId: z.string().min(1),
});

const pageIdSchema = z.object({
  pageId: z.string().min(1),
});

const updateFacebookUserAccountAfterOAuthSchema = z.object({
  userId: z.string().min(1),
  state: z.string().min(1),
  accessToken: z.string().min(1),
  expiresIn: z.number().positive().optional(),
  scopes: z.array(z.string()).optional(),
  granularScopes: z.array(z.object({ scope: z.string() })).optional(),
  dataAccessExpiresAt: z.number().optional(),
  issuedAt: z.number().optional(),
  facebookUserId: z.string().min(1),
  application: z.string().optional(),
});

type UpdateFacebookUserAccountAfterOAuthParams = z.infer<typeof updateFacebookUserAccountAfterOAuthSchema>;

function getMetadataRecord(metadata: unknown): any {
  if (metadata && typeof metadata === 'object' && !Array.isArray(metadata)) {
    return { ...metadata };
  }
  return {};
}

function computeExpiresAt(expiresIn?: number | null) {
  if (!expiresIn) return null;
  return new Date(Date.now() + expiresIn * 1000);
}

function buildMetadata(page: FacebookPageSummary, details: FacebookPageDetails): any {
  return {
    tasks: page.tasks,
    category: page.category,
    category_list: page.category_list,
    cover: details.cover,
    bio: details.bio,
    location: details.location,
    link: details.link,
  };
}

async function fetchFacebookPagesForUser(userId: string): Promise<{
  account: {
    id: string;
    accessToken: string;
    platformId: string;
    metadata: any;
  } | null;
  pages: FacebookPageSummary[];
}> {
  const facebookAccount = await prisma.socialMediaAccount.findFirst({
    where: {
      userId,
      platform: FACEBOOK_USER_PLATFORM,
      isActive: true,
      accessToken: { not: 'pending' },
    },
    orderBy: {
      updatedAt: 'desc',
    },
  });

  if (!facebookAccount) {
    return { account: null, pages: [] };
  }

  const pages = await getFacebookUserPages(facebookAccount.platformId, facebookAccount.accessToken);

  return {
    account: {
      id: facebookAccount.id,
      accessToken: facebookAccount.accessToken,
      platformId: facebookAccount.platformId,
      metadata: getMetadataRecord(facebookAccount.metadata),
    },
    pages,
  };
}

export const initiateFacebookPagesAuth = createServerFn({ method: 'POST' }).handler(async () => {
  const session = await getSession();
  if (!session?.user?.id) {
    throw new Error('Unauthorized');
  }

  const state = nanoid(32);
  const existingAccount = await prisma.socialMediaAccount.findFirst({
    where: {
      userId: session.user.id,
      platform: FACEBOOK_USER_PLATFORM,
    },
  });

  if (existingAccount) {
    const metadata = getMetadataRecord(existingAccount.metadata);
    metadata.pendingState = state;
    metadata.pendingStateCreatedAt = new Date().toISOString();

    await prisma.socialMediaAccount.update({
      where: { id: existingAccount.id },
      data: {
        metadata,
        updatedAt: new Date(),
      },
    });
  } else {
    await prisma.socialMediaAccount.create({
      data: {
        userId: session.user.id,
        platform: FACEBOOK_USER_PLATFORM,
        platformId: `pending:${state}`,
        accessToken: 'pending',
        tokenType: 'Bearer',
        scope: FACEBOOK_CONFIG.scopes.join(','),
        isActive: false,
        metadata: {
          pendingState: state,
          pendingStateCreatedAt: new Date().toISOString(),
        },
      },
    });
  }

  const authUrl = generateFacebookAuthUrl(state);

  return {
    authUrl,
    state,
  };
});

export const getFacebookPageAccounts = createServerFn({ method: 'GET' }).handler(async () => {
  const session = await getSession();
  if (!session?.user?.id) {
    throw new Error('Unauthorized');
  }

  return prisma.socialMediaAccount.findMany({
    where: {
      userId: session.user.id,
      platform: FACEBOOK_PAGE_PLATFORM,
      isActive: true,
    },
    orderBy: {
      createdAt: 'desc',
    },
  });
});

export const disconnectFacebookPageAccount = createServerFn({ method: 'POST' })
  .validator(accountIdSchema)
  .handler(async ({ data }) => {
    const session = await getSession();
    if (!session?.user?.id) {
      throw new Error('Unauthorized');
    }

    const account = await prisma.socialMediaAccount.findFirst({
      where: {
        id: data.accountId,
        userId: session.user.id,
        platform: FACEBOOK_PAGE_PLATFORM,
      },
    });

    if (!account) {
      throw new Error('Facebook page account not found');
    }

    await prisma.socialMediaAccount.update({
      where: { id: data.accountId },
      data: {
        isActive: false,
        updatedAt: new Date(),
      },
    });

    // Client caller invalidates /dashboard/settings/social-media-accounts after mutation.
  });

export const fetchFacebookPagesFromSession = createServerFn({ method: 'GET' }).handler(async (): Promise<{
  account: {
    id: string;
    accessToken: string;
    platformId: string;
    metadata: any;
  } | null;
  pages: FacebookPageSummary[];
}> => {
  const session = await getSession();
  if (!session?.user?.id) {
    throw new Error('Unauthorized');
  }

  return fetchFacebookPagesForUser(session.user.id);
});

export const cancelFacebookPagesSelection = createServerFn({ method: 'POST' }).handler(async () => {
  const session = await getSession();
  if (!session?.user?.id) {
    throw new Error('Unauthorized');
  }

  const facebookAccount = await prisma.socialMediaAccount.findFirst({
    where: {
      userId: session.user.id,
      platform: FACEBOOK_USER_PLATFORM,
    },
  });

  if (!facebookAccount) {
    return;
  }

  const metadata = getMetadataRecord(facebookAccount.metadata);
  delete metadata.pendingState;
  delete metadata.pendingStateCreatedAt;

  if (facebookAccount.accessToken === 'pending') {
    await prisma.socialMediaAccount.delete({ where: { id: facebookAccount.id } });
    return;
  }

  await prisma.socialMediaAccount.update({
    where: { id: facebookAccount.id },
    data: {
      metadata,
      updatedAt: new Date(),
    },
  });
});

export const connectFacebookPage = createServerFn({ method: 'POST' })
  .validator(pageIdSchema)
  .handler(async ({ data }) => {
    const session = await getSession();
    if (!session?.user?.id) {
      throw new Error('Unauthorized');
    }

    const { account: facebookAccount, pages } = await fetchFacebookPagesForUser(session.user.id);

    if (!facebookAccount) {
      throw new Error('Facebook account authorization not found. Please reconnect.');
    }

    const selectedPage = pages.find((page) => page.id === data.pageId);
    if (!selectedPage) {
      throw new Error('Selected Facebook page not found in available pages.');
    }

    const pageDetails = await getFacebookPageDetails(data.pageId, selectedPage.access_token);

    const expiresAt = new Date('2099-01-01T00:00:00.000Z');
    const scope = FACEBOOK_CONFIG.scopes.join(',');
    const userId = session.user.id;

    await prisma.$transaction(async (tx) => {
      await tx.socialMediaAccount.updateMany({
        where: {
          userId,
          platform: FACEBOOK_PAGE_PLATFORM,
          isActive: true,
        },
        data: {
          isActive: false,
          updatedAt: new Date(),
        },
      });

      await tx.socialMediaAccount.upsert({
        where: {
          userId_platform_platformId: {
            userId,
            platform: FACEBOOK_PAGE_PLATFORM,
            platformId: data.pageId,
          },
        },
        update: {
          accessToken: selectedPage.access_token,
          refreshToken: null,
          tokenType: 'Bearer',
          scope,
          expiresAt,
          username: pageDetails.username || pageDetails.name,
          displayName: pageDetails.name,
          avatarUrl: pageDetails.picture?.data?.url,
          description: pageDetails.description || pageDetails.bio,
          metadata: buildMetadata(selectedPage, pageDetails),
          isActive: true,
          updatedAt: new Date(),
        },
        create: {
          userId,
          platform: FACEBOOK_PAGE_PLATFORM,
          platformId: data.pageId,
          accessToken: selectedPage.access_token,
          tokenType: 'Bearer',
          scope,
          expiresAt,
          username: pageDetails.username || pageDetails.name,
          displayName: pageDetails.name,
          avatarUrl: pageDetails.picture?.data?.url,
          description: pageDetails.description || pageDetails.bio,
          metadata: buildMetadata(selectedPage, pageDetails),
          isActive: true,
        },
      });
    });

    // Client caller invalidates /dashboard/settings/social-media-accounts after mutation.
    return { success: true };
  });

// SERVER-INTERNAL ONLY. OAuth callback routes authorize the session and pass the userId.
// Do not convert this to createServerFn because it accepts a caller-supplied userId.
export async function updateFacebookUserAccountAfterOAuth(
  params: UpdateFacebookUserAccountAfterOAuthParams,
) {
  const validatedParams = updateFacebookUserAccountAfterOAuthSchema.parse(params);
  const facebookAccount = await prisma.socialMediaAccount.findFirst({
    where: {
      userId: validatedParams.userId,
      platform: FACEBOOK_USER_PLATFORM,
    },
  });

  if (!facebookAccount) {
    throw new Error('Pending Facebook authorization not found');
  }

  const metadata = getMetadataRecord(facebookAccount.metadata);
  if (metadata.pendingState !== validatedParams.state) {
    throw new Error('OAuth state mismatch');
  }

  metadata.pendingState = null;
  metadata.pendingStateCreatedAt = null;
  metadata.scopes = validatedParams.scopes;
  metadata.granularScopes = validatedParams.granularScopes;
  metadata.dataAccessExpiresAt = validatedParams.dataAccessExpiresAt;
  metadata.issuedAt = validatedParams.issuedAt;
  metadata.application = validatedParams.application;

  await prisma.socialMediaAccount.update({
    where: { id: facebookAccount.id },
    data: {
      platformId: validatedParams.facebookUserId,
      accessToken: validatedParams.accessToken,
      scope: validatedParams.scopes?.join(',') ?? FACEBOOK_CONFIG.scopes.join(','),
      expiresAt: computeExpiresAt(validatedParams.expiresIn),
      isActive: true,
      metadata,
      updatedAt: new Date(),
    },
  });
}
