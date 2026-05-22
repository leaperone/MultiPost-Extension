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

/**
 * 发布类型
 */
export type PublishType = "dynamic" | "video" | "article" | "podcast";

/**
 * 追踪草稿创建事件
 * @param publishType - 发布类型
 * @param hasTitle - 是否有标题
 * @param hasContent - 是否有内容
 * @param hasMedia - 是否有媒体文件
 */
export const trackDraftCreated = (
  publishType: PublishType,
  hasTitle: boolean,
  hasContent: boolean,
  hasMedia: boolean,
) => {
  if (typeof window === "undefined") {
    return;
  }

  import("posthog-js").then((module) => {
    const posthog = module.default;
    posthog.capture("draft_created", {
      publish_type: publishType,
      has_title: hasTitle,
      has_content: hasContent,
      has_media: hasMedia,
      timestamp: Date.now(),
    });
  });
};

/**
 * 追踪平台选择事件
 * @param platforms - 选中的平台列表
 * @param publishType - 发布类型
 */
export const trackPlatformSelected = (platforms: string[], publishType: PublishType) => {
  if (typeof window === "undefined") {
    return;
  }

  import("posthog-js").then((module) => {
    const posthog = module.default;
    posthog.capture("platform_selected", {
      platforms,
      platform_count: platforms.length,
      publish_type: publishType,
      timestamp: Date.now(),
    });
  });
};

/**
 * 追踪发布发起事件
 * @param publishType - 发布类型
 * @param platforms - 发布平台列表
 * @param hasImages - 是否包含图片
 * @param hasVideos - 是否包含视频
 * @param autoPublish - 是否自动发布
 */
export const trackPublishInitiated = (
  publishType: PublishType,
  platforms: string[],
  hasImages: boolean,
  hasVideos: boolean,
  autoPublish: boolean,
) => {
  if (typeof window === "undefined") {
    return;
  }

  import("posthog-js").then((module) => {
    const posthog = module.default;
    posthog.capture("publish_initiated", {
      publish_type: publishType,
      platforms,
      platform_count: platforms.length,
      has_images: hasImages,
      has_videos: hasVideos,
      auto_publish: autoPublish,
      timestamp: Date.now(),
    });
  });
};

/**
 * 追踪发布成功事件
 * @param publishType - 发布类型
 * @param platforms - 发布平台列表
 * @param contentLength - 内容长度
 * @param mediaCount - 媒体文件数量
 */
export const trackPublishSuccess = (
  publishType: PublishType,
  platforms: string[],
  contentLength: number,
  mediaCount: number,
) => {
  if (typeof window === "undefined") {
    return;
  }

  import("posthog-js").then((module) => {
    const posthog = module.default;
    posthog.capture("publish_success", {
      publish_type: publishType,
      platforms,
      platform_count: platforms.length,
      content_length: contentLength,
      media_count: mediaCount,
      timestamp: Date.now(),
    });
  });
};

/**
 * 追踪发布已派发事件
 * @description 浏览器扩展是 fire-and-forget 模式：postMessage 发出后扩展会另开 popup 让用户继续操作，
 *              老 tab 上的 funcPublish 拿不到真正的成功/失败响应，30s 后必然 timeout。
 *              这条事件代表"已成功派发给扩展"，是当前可观测的真实终态。
 *              真正的 publish_success / publish_failed 需要扩展端补 sendResponse 后才能复活。
 */
export const trackPublishDispatched = (
  publishType: PublishType,
  platforms: string[],
) => {
  if (typeof window === "undefined") {
    return;
  }

  import("posthog-js").then((module) => {
    const posthog = module.default;
    posthog.capture("publish_dispatched", {
      publish_type: publishType,
      platforms,
      platform_count: platforms.length,
      timestamp: Date.now(),
    });
  });
};

/**
 * 追踪发布失败事件
 * @param publishType - 发布类型
 * @param platforms - 发布平台列表
 * @param error - 错误信息
 */
export const trackPublishFailed = (
  publishType: PublishType,
  platforms: string[],
  error?: string,
) => {
  if (typeof window === "undefined") {
    return;
  }

  // 扩展 fire-and-forget 模式下 30s timeout 不是真失败，跳过上报避免污染失败率指标
  if (error && error.startsWith("Request timeout after")) {
    return;
  }

  import("posthog-js").then((module) => {
    const posthog = module.default;
    posthog.capture("publish_failed", {
      publish_type: publishType,
      platforms,
      platform_count: platforms.length,
      error,
      timestamp: Date.now(),
    });
  });
};
