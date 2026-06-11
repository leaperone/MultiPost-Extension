import { createServerFn } from '@tanstack/react-start';
import { SocialMediaAccount } from '@db/schema/schema';
import { and, desc, eq, ne } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { z } from 'zod';

import { db } from '../../../lib/db';
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

function getMetadataRecord(metadata: unknown): any {
  if (metadata && typeof metadata === 'object' && !Array.isArray(metadata)) {
    return { ...metadata };
  }
  return {};
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
  const [facebookAccount] = await db
    .select()
    .from(SocialMediaAccount)
    .where(
      and(
        eq(SocialMediaAccount.userId, userId),
        eq(SocialMediaAccount.platform, FACEBOOK_USER_PLATFORM),
        eq(SocialMediaAccount.isActive, true),
        ne(SocialMediaAccount.accessToken, 'pending'),
      ),
    )
    .orderBy(desc(SocialMediaAccount.updatedAt))
    .limit(1);

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
  const [existingAccount] = await db
    .select()
    .from(SocialMediaAccount)
    .where(
      and(
        eq(SocialMediaAccount.userId, session.user.id),
        eq(SocialMediaAccount.platform, FACEBOOK_USER_PLATFORM),
      ),
    )
    .limit(1);

  if (existingAccount) {
    const metadata = getMetadataRecord(existingAccount.metadata);
    metadata.pendingState = state;
    metadata.pendingStateCreatedAt = new Date().toISOString();

    await db
      .update(SocialMediaAccount)
      .set({
        metadata,
        updatedAt: new Date(),
      })
      .where(eq(SocialMediaAccount.id, existingAccount.id));
  } else {
    await db.insert(SocialMediaAccount).values({
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

  return db
    .select()
    .from(SocialMediaAccount)
    .where(
      and(
        eq(SocialMediaAccount.userId, session.user.id),
        eq(SocialMediaAccount.platform, FACEBOOK_PAGE_PLATFORM),
        eq(SocialMediaAccount.isActive, true),
      ),
    )
    .orderBy(desc(SocialMediaAccount.createdAt));
});

export const disconnectFacebookPageAccount = createServerFn({ method: 'POST' })
  .validator(accountIdSchema)
  .handler(async ({ data }) => {
    const session = await getSession();
    if (!session?.user?.id) {
      throw new Error('Unauthorized');
    }

    const [account] = await db
      .select()
      .from(SocialMediaAccount)
      .where(
        and(
          eq(SocialMediaAccount.id, data.accountId),
          eq(SocialMediaAccount.userId, session.user.id),
          eq(SocialMediaAccount.platform, FACEBOOK_PAGE_PLATFORM),
        ),
      )
      .limit(1);

    if (!account) {
      throw new Error('Facebook page account not found');
    }

    await db
      .update(SocialMediaAccount)
      .set({
        isActive: false,
        updatedAt: new Date(),
      })
      .where(eq(SocialMediaAccount.id, data.accountId));

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

  const [facebookAccount] = await db
    .select()
    .from(SocialMediaAccount)
    .where(
      and(
        eq(SocialMediaAccount.userId, session.user.id),
        eq(SocialMediaAccount.platform, FACEBOOK_USER_PLATFORM),
      ),
    )
    .limit(1);

  if (!facebookAccount) {
    return;
  }

  const metadata = getMetadataRecord(facebookAccount.metadata);
  delete metadata.pendingState;
  delete metadata.pendingStateCreatedAt;

  if (facebookAccount.accessToken === 'pending') {
    await db.delete(SocialMediaAccount).where(eq(SocialMediaAccount.id, facebookAccount.id));
    return;
  }

  await db
    .update(SocialMediaAccount)
    .set({
      metadata,
      updatedAt: new Date(),
    })
    .where(eq(SocialMediaAccount.id, facebookAccount.id));
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

    await db.transaction(async (tx) => {
      await tx
        .update(SocialMediaAccount)
        .set({
          isActive: false,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(SocialMediaAccount.userId, userId),
            eq(SocialMediaAccount.platform, FACEBOOK_PAGE_PLATFORM),
            eq(SocialMediaAccount.isActive, true),
          ),
        );

      await tx
        .insert(SocialMediaAccount)
        .values({
            userId,
            platform: FACEBOOK_PAGE_PLATFORM,
            platformId: data.pageId,
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
        })
        .onConflictDoUpdate({
          target: [
            SocialMediaAccount.userId,
            SocialMediaAccount.platform,
            SocialMediaAccount.platformId,
          ],
          set: {
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
        });
    });

    // Client caller invalidates /dashboard/settings/social-media-accounts after mutation.
    return { success: true };
  });

// updateFacebookUserAccountAfterOAuth lives in ./server — it is a plain export
// that touches the db, so keeping it here would pull pg into the client bundle.
