/**
 * Markdown 图片引用的纯函数工具。
 *
 * 发布流程（src/tabs/publish.tsx）会把文章里的远程图片抓取为本地 blob URL，
 * 需要在 markdown 文本中精确替换对应图片的 URL。URL 往往带有查询串
 * （?w=1108&h=738），必须做正则转义并全串匹配，避免误伤前缀相同的其他图片。
 */

/** 转义字符串中的正则元字符，使其可以安全嵌入 RegExp。 */
export function escapeRegExpUrl(url: string): string {
  return url.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * 将 markdown 中所有指向 `from` 的图片 URL 替换为 `to`，保留 alt 文本。
 * 仅全串匹配 `![alt](from)`，不处理 HTML <img> 标签（HTML 走 DOM 改写）。
 */
export function replaceMarkdownImageUrl(markdown: string, from: string, to: string): string {
  if (!from || !to) {
    return markdown;
  }
  const imgRegex = new RegExp(`!\\[.*?\\]\\(${escapeRegExpUrl(from)}\\)`, "g");
  return markdown.replace(imgRegex, (match) => match.replace(from, to));
}
