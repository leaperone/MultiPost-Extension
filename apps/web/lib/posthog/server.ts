/**
 * @file PostHog 服务端客户端
 * @description 提供服务端 PostHog 实例
 */

import type { PostHog } from "posthog-node";

import { POSTHOG_HOST, POSTHOG_KEY } from "./config";

let cachedClient: PostHog | undefined;

export const getPosthogClient = (): PostHog | undefined => {
  if (typeof window !== "undefined") {
    return undefined;
  }

  if (!POSTHOG_KEY) {
    return undefined;
  }

  if (!cachedClient) {
     
    const { PostHog } = require("posthog-node");

    cachedClient = new PostHog(POSTHOG_KEY, {
      host: POSTHOG_HOST,
      flushAt: 1,
      flushInterval: 0,
    });
  }

  return cachedClient;
};

export const posthogClient = getPosthogClient();
