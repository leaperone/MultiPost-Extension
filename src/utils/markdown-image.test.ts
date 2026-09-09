import { describe, expect, it } from "vitest";
import { escapeRegExpUrl, replaceMarkdownImageUrl } from "./markdown-image";

// 用例取自真实用户场景：腾讯文档导出的文章图片链接（Referer 防盗链，
// 扩展抓图转存后需把 markdown 中的原始 URL 替换为本地 blob URL）。
const DOCIMG_PNG = "https://docimg5.docs.qq.com/image/w0CQruiSScK_0WV7DlNWXg.png?w=1108&h=738";
const DOCIMG_JPEG = "https://docimg4.docs.qq.com/image/AgAABYc1hy6WFxH8OJZAg7p4vwtOzFnq.png?w=318&h=478";
const BLOB_URL = "blob:chrome-extension://abc123/image_0.png";

describe("escapeRegExpUrl", () => {
  it("escapes regex metacharacters in query-string heavy URLs", () => {
    const escaped = escapeRegExpUrl(DOCIMG_PNG);
    expect(escaped).toContain("\\?");
    expect(escaped).not.toMatch(/(?<!\\)\?/);
    expect(escaped).not.toMatch(/(?<!\\)\./);
  });
});

describe("replaceMarkdownImageUrl", () => {
  it("replaces the URL of a matching markdown image and keeps the alt text", () => {
    const markdown = `正文前导\n\n![图片](${DOCIMG_PNG})\n\n正文后继`;
    const result = replaceMarkdownImageUrl(markdown, DOCIMG_PNG, BLOB_URL);
    expect(result).toBe(`正文前导\n\n![图片](${BLOB_URL})\n\n正文后继`);
  });

  it("replaces every occurrence of the same image", () => {
    const markdown = `![图片](${DOCIMG_PNG})\n![图片](${DOCIMG_PNG})`;
    const result = replaceMarkdownImageUrl(markdown, DOCIMG_PNG, BLOB_URL);
    expect(result.match(new RegExp(BLOB_URL, "g"))).toHaveLength(2);
  });

  it("does not replace a different image whose URL shares a prefix", () => {
    const lookalike = "https://docimg5.docs.qq.com/image/w0CQruiSScK_0WV7DlNWXg.png?w=1108&h=7380";
    const markdown = `![图片](${DOCIMG_PNG})\n![另一张](${lookalike})`;
    const result = replaceMarkdownImageUrl(markdown, DOCIMG_PNG, BLOB_URL);
    expect(result).toContain(lookalike);
    expect(result).toContain(BLOB_URL);
  });

  it("only touches the requested URL when several images exist", () => {
    const markdown = `![第一张](${DOCIMG_PNG})\n![第二张](${DOCIMG_JPEG})`;
    const result = replaceMarkdownImageUrl(markdown, DOCIMG_JPEG, BLOB_URL);
    expect(result).toContain(DOCIMG_PNG);
    expect(result).not.toContain(DOCIMG_JPEG);
  });

  it("leaves content without the target URL untouched", () => {
    const markdown = "# 纯文本标题\n\n没有图片的一段话。";
    expect(replaceMarkdownImageUrl(markdown, DOCIMG_PNG, BLOB_URL)).toBe(markdown);
  });

  it("supports empty alt text", () => {
    const markdown = `![](${DOCIMG_PNG})`;
    expect(replaceMarkdownImageUrl(markdown, DOCIMG_PNG, BLOB_URL)).toBe(`![](${BLOB_URL})`);
  });
});
