/**
 * @file PostHog 服务端事件追踪工具函数
 * @description 提供在服务端追踪事件的接口
 */

import { posthogClient } from './server';
import type { SigninMethod } from './events';

/**
 * 服务端追踪登录成功事件
 * @param userId - 用户 ID
 * @param method - 登录方式
 * @param isNewUser - 是否为新用户
 */
export const trackSigninCompletedServer = (userId: string, method: SigninMethod, isNewUser: boolean) => {
  if (!posthogClient) {
    return;
  }

  posthogClient.capture({
    distinctId: userId,
    event: 'signin_completed',
    properties: {
      method,
      is_new_user: isNewUser,
      timestamp: Date.now(),
    },
  });
};

/**
 * 服务端追踪登录失败事件
 * @param identifier - 用户标识（邮箱或用户ID）
 * @param method - 登录方式
 * @param error - 错误信息
 */
export const trackSigninFailedServer = (identifier: string, method: SigninMethod, error?: string) => {
  if (!posthogClient) {
    return;
  }

  posthogClient.capture({
    distinctId: identifier,
    event: 'signin_failed',
    properties: {
      method,
      error,
      timestamp: Date.now(),
    },
  });
};

/**
 * 服务端追踪新用户注册事件
 * @param userId - 用户 ID
 * @param method - 注册方式
 */
export const trackUserCreatedServer = (userId: string, method?: string) => {
  if (!posthogClient) {
    return;
  }

  posthogClient.capture({
    distinctId: userId,
    event: 'user_created',
    properties: {
      method,
      timestamp: Date.now(),
    },
  });
};

/**
 * 服务端追踪 GitHub 注册奖励发放
 * @param userId - 用户 ID
 * @param amount - 奖励金额
 */
export const trackGithubSignupBonusServer = (userId: string, amount: number) => {
  if (!posthogClient) {
    return;
  }

  posthogClient.capture({
    distinctId: userId,
    event: 'github_signup_bonus_awarded',
    properties: {
      amount,
      timestamp: Date.now(),
    },
  });
};
