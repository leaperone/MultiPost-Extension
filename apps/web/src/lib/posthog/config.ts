/**
 * @file PostHog 配置常量
 * @description PostHog 的 API Key 和 Host 配置
 */

function readEnv(name: string) {
  const viteValue = import.meta.env?.[name];
  if (typeof viteValue === "string" && viteValue.trim()) return viteValue.trim();
  const processValue = typeof process !== "undefined" ? process.env[name] : undefined;
  return processValue?.trim() ?? "";
}

export const POSTHOG_KEY = readEnv("NEXT_PUBLIC_POSTHOG_KEY");
export const POSTHOG_HOST = readEnv("NEXT_PUBLIC_POSTHOG_HOST") || "https://t.multipost.app";
