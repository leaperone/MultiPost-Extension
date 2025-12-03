"use client";

import { usePathname, useSearchParams } from "next/navigation";
import posthog from "posthog-js";
import { PostHogProvider } from "posthog-js/react";
import { Suspense, useEffect, useRef } from "react";

import { POSTHOG_HOST, POSTHOG_KEY } from "@/lib/posthog/config";
import { useAppStore } from "@/store/app.store";

let hasInitialized = false;

const ensurePostHog = () => {
  // 开发环境下禁用 PostHog
  if (process.env.NODE_ENV === "development") {
    return;
  }

  if (hasInitialized || typeof window === "undefined" || !POSTHOG_KEY) {
    return;
  }

  posthog.init(POSTHOG_KEY, {
    api_host: POSTHOG_HOST,
    capture_pageview: false,
    person_profiles: "identified_only",
    defaults: "2025-05-24",
    capture_exceptions: true,
    debug: false,
  });

  hasInitialized = true;
};

/**
 * Internal component that uses useSearchParams
 * Must be wrapped in Suspense boundary
 */
function PostHogAnalyticsInner({ children }: { children: React.ReactNode }) {
  const _pathname = usePathname();
  const _searchParams = useSearchParams();
  const { username } = useAppStore();
  const lastUrlRef = useRef<string | null>(null);

  // 捕获页面离开事件（包括在 SPA 中的路由切换）
  useEffect(() => {
    if (!POSTHOG_KEY || typeof window === "undefined") {
      return;
    }

    const currentUrl = window.location.href;

    if (!lastUrlRef.current) {
      lastUrlRef.current = currentUrl;
      return;
    }

    const previousUrl = lastUrlRef.current;

    if (previousUrl !== currentUrl) {
      posthog.capture("$pageleave", {
        $current_url: previousUrl,
        $next_url: currentUrl,
        $pageleave_reason: "spa-route-change",
      });
      lastUrlRef.current = currentUrl;
    }
  }, [_pathname, _searchParams]);

  // 捕获关闭标签页或页面隐藏等离站场景
  useEffect(() => {
    if (!POSTHOG_KEY || typeof window === "undefined") {
      return;
    }

    const eventName = ("onpagehide" in window ? "pagehide" : "unload") as "pagehide" | "unload";

    const handlePageHide = () => {
      const url = lastUrlRef.current ?? window.location.href;

      posthog.capture(
        "$pageleave",
        {
          $current_url: url,
          $pageleave_reason: eventName,
        },
        { transport: "sendBeacon" },
      );
    };

    window.addEventListener(eventName, handlePageHide);

    return () => {
      window.removeEventListener(eventName, handlePageHide);
    };
  }, []);

  // 处理页面浏览事件
  useEffect(() => {
    if (!POSTHOG_KEY || typeof window === "undefined") {
      return;
    }

    posthog.capture("$pageview", { $current_url: window.location.href });
  }, [_pathname, _searchParams]);

  // 处理用户身份识别
  useEffect(() => {
    if (!POSTHOG_KEY || typeof window === "undefined") {
      return;
    }

    // 如果有用户名，识别用户
    if (username) {
      posthog.identify(username, {
        username: username,
      });
    } else {
      // 如果没有用户信息，重置用户身份
      posthog.reset();
    }
  }, [username]);

  return <PostHogProvider client={posthog}>{children}</PostHogProvider>;
}

export function PostHogAnalyticsProvider({ children }: { children: React.ReactNode }) {
  // 开发环境下禁用 PostHog
  if (process.env.NODE_ENV === "development") {
    return <>{children}</>;
  }

  ensurePostHog();

  if (!POSTHOG_KEY) {
    return <>{children}</>;
  }

  return (
    <Suspense fallback={children}>
      <PostHogAnalyticsInner>{children}</PostHogAnalyticsInner>
    </Suspense>
  );
}
