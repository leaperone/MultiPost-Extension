import { multipostDb } from '@/lib/db';
import { Website } from '@prisma/client/client_multipost';

export async function getWebsite(websiteId: string): Promise<Website | null> {
  return await multipostDb.website.findUnique({
    where: {
      id: websiteId,
      deletedAt: null,
    },
  });
}

export async function getWebsiteByShareId(shareId: string): Promise<Website | null> {
  return await multipostDb.website.findUnique({
    where: {
      shareId,
      deletedAt: null,
    },
  });
}

export async function getUserWebsites(userId: string): Promise<Website[]> {
  return await multipostDb.website.findMany({
    where: {
      OR: [{ userId }, { createdBy: userId }],
      deletedAt: null,
    },
    orderBy: {
      createdAt: 'desc',
    },
  });
}

export async function createWebsite(data: {
  name: string;
  domain?: string;
  shareId?: string;
  userId: string;
}): Promise<Website> {
  return await multipostDb.website.create({
    data: {
      ...data,
      createdBy: data.userId,
    },
  });
}

export async function updateWebsite(
  websiteId: string,
  data: Partial<{
    name: string;
    domain: string;
    shareId: string;
  }>,
): Promise<Website> {
  return await multipostDb.website.update({
    where: {
      id: websiteId,
      deletedAt: null,
    },
    data,
  });
}

export async function deleteWebsite(websiteId: string): Promise<Website> {
  return await multipostDb.website.update({
    where: {
      id: websiteId,
      deletedAt: null,
    },
    data: {
      deletedAt: new Date(),
    },
  });
}

export async function resetWebsite(websiteId: string): Promise<Website> {
  return await multipostDb.website.update({
    where: {
      id: websiteId,
      deletedAt: null,
    },
    data: {
      resetAt: new Date(),
    },
  });
}
