'use server';

import { multipostDb } from '@/lib/db';
import { auth } from '@/auth';

export const getUserInfo = async () => {
  const session = await auth();
  const user = session?.user;
  return await multipostDb.user.findUnique({ where: { id: user?.id } });
};
