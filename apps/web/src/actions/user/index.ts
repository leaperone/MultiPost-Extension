import { createServerFn } from '@tanstack/react-start';
import { User } from '@db/schema/auth-schema';
import { eq } from 'drizzle-orm';

import { db } from '../../lib/db';
import { getSession } from '../../lib/session';

export const getUserInfo = createServerFn({ method: 'GET' }).handler(async () => {
  const session = await getSession();
  const user = session?.user;
  if (!user?.id) {
    return null;
  }

  return (await db.select().from(User).where(eq(User.id, user.id)).limit(1))[0] ?? null;
});
