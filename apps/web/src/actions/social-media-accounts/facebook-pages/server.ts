import { SocialMediaAccount } from '@db/schema/schema';
import { and, eq } from 'drizzle-orm';
import { z } from 'zod';

import { db } from '../../../lib/db';
import { FACEBOOK_CONFIG } from './oauth';

// SERVER-INTERNAL ONLY. This module must never be imported from client code:
// it is a plain export (not createServerFn), so the TanStack Start compiler
// will not strip its body, and bundling it client-side drags the whole
// drizzle/pg stack into the browser ("Buffer is not defined").

const FACEBOOK_USER_PLATFORM = 'facebook';

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

// OAuth callback routes authorize the session and pass the userId.
// Do not convert this to createServerFn because it accepts a caller-supplied userId.
export async function updateFacebookUserAccountAfterOAuth(
  params: UpdateFacebookUserAccountAfterOAuthParams,
) {
  const validatedParams = updateFacebookUserAccountAfterOAuthSchema.parse(params);
  const [facebookAccount] = await db
    .select()
    .from(SocialMediaAccount)
    .where(
      and(
        eq(SocialMediaAccount.userId, validatedParams.userId),
        eq(SocialMediaAccount.platform, FACEBOOK_USER_PLATFORM),
      ),
    )
    .limit(1);

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

  await db
    .update(SocialMediaAccount)
    .set({
      platformId: validatedParams.facebookUserId,
      accessToken: validatedParams.accessToken,
      scope: validatedParams.scopes?.join(',') ?? FACEBOOK_CONFIG.scopes.join(','),
      expiresAt: computeExpiresAt(validatedParams.expiresIn),
      isActive: true,
      metadata,
      updatedAt: new Date(),
    })
    .where(eq(SocialMediaAccount.id, facebookAccount.id));
}
