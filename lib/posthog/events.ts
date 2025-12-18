/**
 * @file PostHog 事件追踪工具函数
 * @description 提供统一的事件追踪接口
 */

/**
 * 追踪广告曝光事件
 * @param adId - 广告ID
 * @param adCategory - 广告分类
 * @param adTitle - 广告标题
 * @param adPosition - 广告位置
 */
export const trackAdImpression = (
  adId: string,
  adCategory: "uploader" | "audience",
  adTitle: string,
  adPosition: string,
) => {
  if (typeof window === "undefined") {
    return;
  }

  // 动态导入 posthog-js,仅在客户端环境使用
  import("posthog-js").then((module) => {
    const posthog = module.default;
    posthog.capture("ad_impression", {
      ad_id: adId,
      ad_category: adCategory,
      ad_title: adTitle,
      ad_position: adPosition,
      timestamp: Date.now(),
    });
  });
};

/**
 * 追踪广告点击事件
 * @param adId - 广告ID
 * @param adCategory - 广告分类
 * @param adTitle - 广告标题
 * @param adActionLink - 目标链接
 * @param adPosition - 广告位置
 */
export const trackAdClick = (
  adId: string,
  adCategory: "uploader" | "audience",
  adTitle: string,
  adActionLink: string,
  adPosition: string,
) => {
  if (typeof window === "undefined") {
    return;
  }

  // 动态导入 posthog-js,仅在客户端环境使用
  import("posthog-js").then((module) => {
    const posthog = module.default;
    posthog.capture("ad_click", {
      ad_id: adId,
      ad_category: adCategory,
      ad_title: adTitle,
      ad_action_link: adActionLink,
      ad_position: adPosition,
      timestamp: Date.now(),
    });
  });
};

/**
 * 登录方式类型
 */
export type SigninMethod = "github" | "google" | "passkey" | "email" | "http-email";

/**
 * 追踪登录方式点击事件
 * @param method - 登录方式
 */
export const trackSigninMethodClicked = (method: SigninMethod) => {
  if (typeof window === "undefined") {
    return;
  }

  import("posthog-js").then((module) => {
    const posthog = module.default;
    posthog.capture("signin_method_clicked", {
      method,
      timestamp: Date.now(),
    });
  });
};

/**
 * 追踪登录开始事件
 * @param method - 登录方式
 */
export const trackSigninStarted = (method: SigninMethod) => {
  if (typeof window === "undefined") {
    return;
  }

  import("posthog-js").then((module) => {
    const posthog = module.default;
    posthog.capture("signin_started", {
      method,
      timestamp: Date.now(),
    });
  });
};

/**
 * 追踪登录成功事件
 * @param method - 登录方式
 * @param isNewUser - 是否为新用户
 */
export const trackSigninCompleted = (method: SigninMethod, isNewUser: boolean) => {
  if (typeof window === "undefined") {
    return;
  }

  import("posthog-js").then((module) => {
    const posthog = module.default;
    posthog.capture("signin_completed", {
      method,
      is_new_user: isNewUser,
      timestamp: Date.now(),
    });
  });
};

/**
 * 追踪登录失败事件
 * @param method - 登录方式
 * @param error - 错误信息
 */
export const trackSigninFailed = (method: SigninMethod, error?: string) => {
  if (typeof window === "undefined") {
    return;
  }

  import("posthog-js").then((module) => {
    const posthog = module.default;
    posthog.capture("signin_failed", {
      method,
      error,
      timestamp: Date.now(),
    });
  });
};

/**
 * 追踪邮件验证发送事件
 * @param email - 邮箱地址（哈希处理以保护隐私）
 */
export const trackEmailVerificationSent = (emailHash?: string) => {
  if (typeof window === "undefined") {
    return;
  }

  import("posthog-js").then((module) => {
    const posthog = module.default;
    posthog.capture("email_verification_sent", {
      email_hash: emailHash,
      timestamp: Date.now(),
    });
  });
};

/**
 * 追踪邮件验证链接点击事件
 * @param source - 来源（例如: email_link）
 */
export const trackEmailVerificationClicked = (source?: string) => {
  if (typeof window === "undefined") {
    return;
  }

  import("posthog-js").then((module) => {
    const posthog = module.default;
    posthog.capture("email_verification_clicked", {
      source,
      timestamp: Date.now(),
    });
  });
};
