'use server';

import { auth } from "@/auth";
import { multipostDb } from "@/lib/db";

interface CreateWebsiteData {
  name: string;
  domain?: string;
}

export async function createWebsite(data: CreateWebsiteData) {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error('未授权');
  }

  const website = await multipostDb.website.create({
    data: {
      name: data.name,
      domain: data.domain,
      userId: session.user.id,
    },
  });

  return website;
}

export async function getWebsites() {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error('未授权');
  }

  const websites = await multipostDb.website.findMany({
    where: {
      userId: session.user.id,
      deletedAt: null,
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  return websites;
}
