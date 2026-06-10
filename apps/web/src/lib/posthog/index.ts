/**
 * @file PostHog 客户端配置导出
 * @description 仅导出客户端安全的 PostHog 功能
 * @important 不要在这里导出服务端模块 (posthog-node),避免客户端组件导入时出错
 */

// 配置常量
export { POSTHOG_HOST, POSTHOG_KEY } from "./config";

// 事件追踪 (客户端专用)
export { trackAdClick, trackAdImpression } from "./events";

// 发布事件追踪
export {
  trackDraftCreated,
  trackPlatformSelected,
  trackPublishInitiated,
  trackPublishDispatched,
  trackPublishSuccess,
  trackPublishFailed,
} from "./events";
export type { PublishType } from "./events";

// 用户身份管理 (客户端专用)
export { getCurrentUserId, identifyUser, isUserIdentified, resetUser, setUserProperties } from "./user";
