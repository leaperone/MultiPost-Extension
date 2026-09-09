/**
 * 防盗链图片 CDN 的 Referer 改写规则。
 *
 * 部分文档/内容平台的图片 CDN 校验 Referer 白名单：扩展页面、Web 工作台预览
 * 以及平台侧脚本抓取图片时 Referer 均不在白名单内，会得到 403（表现为预览裂图、
 * 发布时图片丢失，参见 issue #201/#228）。这里用 declarativeNetRequest 在
 * 网络层把这些请求的 Referer 改写为对应站点自身的值。
 *
 * 收录原则：每个 host 必须实测（空 Referer 与外域 Referer 均被拒、目标 Referer
 * 返回 200）后才加入下表。新增平台在 ANTI_HOTLINK_REFERERS 中加一行即可。
 */
export interface RefererRuleConfig {
  /** 图片 CDN 域名（含全部子域名），不带协议与路径。 */
  domain: string;
  /** 需要改写成的 Referer，必须以 https:// 开头、以 / 结尾。 */
  referer: string;
}

/**
 * 实测记录（2026-09，curl GET + Chrome UA）：
 * - docs.qq.com：无 Referer 403；Referer: https://mp.toutiao.com/ 403；
 *   Referer: https://docs.qq.com/ 200 → 收录。
 * - picx.zhimg.com：外域 Referer 200 → 无需收录。
 * - mmbiz.qpic.cn：允许空 Referer（扩展抓图不带 Referer 已可用）→ 无需收录。
 * - 飞书（internal-api-drive-stream.feishu.cn 等）：图片 URL 带签名且多数需登录态
 *   Cookie，单靠 Referer 不足，暂不收录，待有公开样本验证后补充。
 */
export const ANTI_HOTLINK_REFERERS: RefererRuleConfig[] = [{ domain: "docs.qq.com", referer: "https://docs.qq.com/" }];

/** 本服务保留的动态规则 id 区间起点，sync 时只清理本区间内的旧规则。 */
export const RULE_ID_BASE = 1;
const RULE_ID_RANGE_SIZE = 1000;

const IMAGE_RESOURCE_TYPES: chrome.declarativeNetRequest.ResourceType[] = [
  "image",
  "xmlhttprequest",
  "media",
] as chrome.declarativeNetRequest.ResourceType[];

/** 校验配置合法性，返回错误描述列表；空数组表示全部合法。 */
export function validateRefererConfigs(configs: RefererRuleConfig[]): string[] {
  const errors: string[] = [];
  for (const { domain, referer } of configs) {
    if (!domain || domain !== domain.trim() || domain.includes("://") || domain.includes("/")) {
      errors.push(`invalid domain: ${domain}`);
    }
    if (!referer.startsWith("https://") || !referer.endsWith("/")) {
      errors.push(`invalid referer: ${referer}`);
    }
  }
  return errors;
}

/** 将 host 配置构建为 declarativeNetRequest 动态规则；纯函数，便于测试。 */
export function buildRefererRules(configs: RefererRuleConfig[]): chrome.declarativeNetRequest.Rule[] {
  return configs.map((config, index) => ({
    id: RULE_ID_BASE + index,
    priority: 1,
    action: {
      type: "modifyHeaders" as chrome.declarativeNetRequest.RuleActionType,
      requestHeaders: [
        { header: "Referer", operation: "set" as chrome.declarativeNetRequest.HeaderOperation, value: config.referer },
      ],
    },
    condition: {
      requestDomains: [config.domain],
      resourceTypes: IMAGE_RESOURCE_TYPES,
    },
  }));
}

/** 把当前配置同步到浏览器：清理本服务旧规则后写入最新规则。幂等。 */
export async function syncAntiHotlinkRules(): Promise<void> {
  const addRules = buildRefererRules(ANTI_HOTLINK_REFERERS);
  const existing = await chrome.declarativeNetRequest.getDynamicRules();
  const removeRuleIds = existing
    .map((rule) => rule.id)
    .filter((id) => id >= RULE_ID_BASE && id < RULE_ID_BASE + RULE_ID_RANGE_SIZE);
  await chrome.declarativeNetRequest.updateDynamicRules({ removeRuleIds, addRules });
}
