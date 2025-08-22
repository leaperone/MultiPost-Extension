'use server'

import { auth } from "@/auth";
import { multipostDb } from "@/lib/db";

/**
 * Get all social media accounts for the current user
 * @description Retrieves all social media accounts for publishing
 * @returns Promise with success status and accounts array
 */
export async function getSocialMediaAccounts() {
    try {
      const session = await auth();
      if (!session?.user?.id) {
        return {
          success: false,
          error: 'Authentication failed',
        };
      }
  
      const accounts = await multipostDb.socialMediaAccount.findMany({
        where: {
          userId: session.user.id,
        },
        orderBy: [{ platform: 'asc' }, { createdAt: 'desc' }],
      });
  
      return {
        success: true,
        data: accounts,
      };
    } catch (error) {
      return {
        success: false,
        error: 'Failed to fetch social media accounts',
      };
    }
  }