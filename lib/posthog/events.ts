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
