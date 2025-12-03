/**
 * @file PostHog 用户身份管理
 * @description 提供用户身份识别和属性设置功能
 */

import posthog from "posthog-js";

/**
 * 设置用户身份
 * @param userId - 用户唯一标识符
 * @param userProperties - 用户属性（可选）
 */
export const identifyUser = (userId: string, userProperties?: Record<string, unknown>) => {
  if (typeof window === "undefined") {
    return;
  }

  posthog.identify(userId, userProperties);
};

/**
 * 重置用户身份（登出时使用）
 */
export const resetUser = () => {
  if (typeof window === "undefined") {
    return;
  }

  posthog.reset();
};

/**
 * 设置用户属性
 * @param properties - 用户属性对象
 */
export const setUserProperties = (properties: Record<string, unknown>) => {
  if (typeof window === "undefined") {
    return;
  }

  posthog.people.set(properties);
};

/**
 * 获取当前用户 ID
 * @returns 当前用户 ID 或 null
 */
export const getCurrentUserId = (): string | null => {
  if (typeof window === "undefined") {
    return null;
  }

  return posthog.get_distinct_id();
};

/**
 * 检查用户是否已识别
 * @returns 是否已识别用户
 */
export const isUserIdentified = (): boolean => {
  if (typeof window === "undefined") {
    return false;
  }

  return posthog.get_distinct_id() !== posthog.get_property("$device_id");
};
