/**
 * @file PostHog React Hook
 * @description 提供在 React 组件中使用 PostHog 的便捷方法
 */

import { getCurrentUserId, isUserIdentified, setUserProperties } from "@/lib/posthog/user";
import { useAppStore } from "@/store/app.store";

/**
 * PostHog 用户管理 Hook
 * @description 自动与 app store 集成，用户身份由 Provider 自动管理
 * @returns PostHog 用户管理方法
 */
export const usePostHog = () => {
  const { username } = useAppStore();

  const setProperties = (properties: Record<string, unknown>) => {
    setUserProperties(properties);
  };

  const getUserId = () => {
    return getCurrentUserId();
  };

  const isIdentified = () => {
    return isUserIdentified();
  };

  const getCurrentUser = () => {
    return { username };
  };

  return {
    setProperties,
    getUserId,
    isIdentified,
    getCurrentUser,
    // 用户身份由 Provider 自动管理，不需要手动调用 identify/reset
  };
};
