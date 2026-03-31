'use server';

import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { revalidatePath } from 'next/cache';

export async function deleteClient(clientId: string) {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error('Not authenticated');
  }

  const client = await prisma.extensionClient.findFirst({
    where: {
      id: clientId,
      userId: session.user.id,
    },
  });

  if (!client) {
    throw new Error('Client not found or you do not have permission to delete it.');
  }

  if (client.deletedAt) {
    // This client is already soft-deleted.
    // We can either throw an error or just return successfully.
    // Let's just revalidate and return to make the UI update correctly if it was out of sync.
    revalidatePath('/dashboard/settings/client');
    return;
  }

  await prisma.extensionClient.update({
    where: {
      id: clientId,
      userId: session.user.id,
    },
    data: {
      deletedAt: new Date(),
    },
  });

  revalidatePath('/dashboard/settings/client');
}
