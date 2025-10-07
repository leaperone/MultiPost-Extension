'use server';

import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { revalidatePath } from 'next/cache';
import { nanoid } from 'nanoid';
import {
  FACEBOOK_CONFIG,
  FacebookPageDetails,
  FacebookPageSummary,
  generateFacebookAuthUrl,
  getFacebookPageDetails,
  getFacebookUserPages,
} from './oauth';

const FACEBOOK_USER_PLATFORM = 'facebook';
const FACEBOOK_PAGE_PLATFORM = 'facebook-pages';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
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

export async function initiateFacebookPagesAuth() {
  const session = await auth();
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
}

export async function getFacebookPageAccounts() {
  const session = await auth();
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
}

export async function disconnectFacebookPageAccount(accountId: string) {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error('Unauthorized');
  }

  const account = await prisma.socialMediaAccount.findFirst({
    where: {
      id: accountId,
      userId: session.user.id,
      platform: FACEBOOK_PAGE_PLATFORM,
    },
  });

  if (!account) {
    throw new Error('Facebook page account not found');
  }

  await prisma.socialMediaAccount.update({
    where: { id: accountId },
    data: {
      isActive: false,
      updatedAt: new Date(),
    },
  });

  revalidatePath('/dashboard/settings/social-media-accounts');
}

export async function fetchFacebookPagesFromSession(): Promise<{
  account: {
    id: string;
    accessToken: string;
    platformId: string;
    metadata: Record<string, unknown>;
  } | null;
  pages: FacebookPageSummary[];
}> {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error('Unauthorized');
  }

  const facebookAccount = await prisma.socialMediaAccount.findFirst({
    where: {
      userId: session.user.id,
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

export async function cancelFacebookPagesSelection() {
  const session = await auth();
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
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
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

export async function connectFacebookPage(pageId: string) {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error('Unauthorized');
  }

  const { account: facebookAccount, pages } = await fetchFacebookPagesFromSession();

  if (!facebookAccount) {
    throw new Error('Facebook account authorization not found. Please reconnect.');
  }

  const selectedPage = pages.find((page) => page.id === pageId);
  if (!selectedPage) {
    throw new Error('Selected Facebook page not found in available pages.');
  }

  const pageDetails = await getFacebookPageDetails(pageId, selectedPage.access_token);

  const expiresAt = new Date('2099-01-01T00:00:00.000Z');
  const scope = FACEBOOK_CONFIG.scopes.join(',');

  // 使用事务确保数据一致性
  await prisma.$transaction(async (tx) => {
    // 先将该用户的所有其他 Facebook 页面设置为非活跃状态
    await tx.socialMediaAccount.updateMany({
      where: {
        userId: session.user.id!,
        platform: FACEBOOK_PAGE_PLATFORM,
        isActive: true,
      },
      data: {
        isActive: false,
        updatedAt: new Date(),
      },
    });

    // 然后创建或更新选中的页面为活跃状态
    await tx.socialMediaAccount.upsert({
      where: {
        userId_platform_platformId: {
          userId: session.user.id!,
          platform: FACEBOOK_PAGE_PLATFORM,
          platformId: pageId,
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
        userId: session.user.id!,
        platform: FACEBOOK_PAGE_PLATFORM,
        platformId: pageId,
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

  revalidatePath('/dashboard/settings/social-media-accounts');

  return { success: true };
}

export async function updateFacebookUserAccountAfterOAuth(params: {
  userId: string;
  state: string;
  accessToken: string;
  expiresIn?: number;
  scopes?: string[];
  granularScopes?: { scope: string }[];
  dataAccessExpiresAt?: number;
  issuedAt?: number;
  facebookUserId: string;
  application?: string;
}) {
  const facebookAccount = await prisma.socialMediaAccount.findFirst({
    where: {
      userId: params.userId,
      platform: FACEBOOK_USER_PLATFORM,
    },
  });

  if (!facebookAccount) {
    throw new Error('Pending Facebook authorization not found');
  }

  const metadata = getMetadataRecord(facebookAccount.metadata);
  if (metadata.pendingState !== params.state) {
    throw new Error('OAuth state mismatch');
  }

  metadata.pendingState = null;
  metadata.pendingStateCreatedAt = null;
  metadata.scopes = params.scopes;
  metadata.granularScopes = params.granularScopes;
  metadata.dataAccessExpiresAt = params.dataAccessExpiresAt;
  metadata.issuedAt = params.issuedAt;
  metadata.application = params.application;

  await prisma.socialMediaAccount.update({
    where: { id: facebookAccount.id },
    data: {
      platformId: params.facebookUserId,
      accessToken: params.accessToken,
      scope: params.scopes?.join(',') ?? FACEBOOK_CONFIG.scopes.join(','),
      expiresAt: computeExpiresAt(params.expiresIn),
      isActive: true,
      metadata,
      updatedAt: new Date(),
    },
  });
}
