import { createServerFn } from '@tanstack/react-start';

import { multipostDb } from '@/lib/db';
import { getSession } from '../../lib/session';

export const getUserInfo = createServerFn({ method: 'GET' }).handler(async () => {
  const session = await getSession();
  const user = session?.user;
  if (!user?.id) {
    return null;
  }

  return await multipostDb.user.findUnique({ where: { id: user.id } });
});
