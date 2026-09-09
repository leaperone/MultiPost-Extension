import { describe, expect, it } from "vitest";
import { ANTI_HOTLINK_REFERERS, RULE_ID_BASE, buildRefererRules, validateRefererConfigs } from "./anti-hotlink";

describe("ANTI_HOTLINK_REFERERS", () => {
  it("covers referer-protected hosts verified to reject empty and foreign referers", () => {
    const domains = ANTI_HOTLINK_REFERERS.map((config) => config.domain);
    // 腾讯文档图片 CDN：实测无 Referer 403、外域 Referer 403、docs.qq.com Referer 200
    expect(domains).toContain("docs.qq.com");
  });

  it("does not include hosts that accept empty or foreign referers (no rule needed)", () => {
    const domains = ANTI_HOTLINK_REFERERS.map((config) => config.domain);
    // 知乎 zhimg 实测外域 Referer 200；微信 mmbiz 允许空 Referer——都不需要改写
    expect(domains).not.toContain("zhimg.com");
    expect(domains).not.toContain("mmbiz.qpic.cn");
  });
});

describe("validateRefererConfigs", () => {
  it("accepts the shipped configuration", () => {
    expect(validateRefererConfigs(ANTI_HOTLINK_REFERERS)).toEqual([]);
  });

  it("rejects referers without https scheme or trailing slash", () => {
    const errors = validateRefererConfigs([
      { domain: "example.com", referer: "http://example.com/" },
      { domain: "example.org", referer: "https://example.org" },
    ]);
    expect(errors).toHaveLength(2);
  });

  it("rejects domains carrying a scheme, path or whitespace", () => {
    const errors = validateRefererConfigs([
      { domain: "https://example.com", referer: "https://example.com/" },
      { domain: "example.com/images", referer: "https://example.com/" },
      { domain: "example.com ", referer: "https://example.com/" },
    ]);
    expect(errors).toHaveLength(3);
  });
});

describe("buildRefererRules", () => {
  const rules = buildRefererRules(ANTI_HOTLINK_REFERERS);

  it("builds one modifyHeaders rule per configured host", () => {
    expect(rules).toHaveLength(ANTI_HOTLINK_REFERERS.length);
    for (const rule of rules) {
      expect(rule.action.type).toBe("modifyHeaders");
      expect(rule.action.requestHeaders).toEqual([
        { header: "Referer", operation: "set", value: expect.stringMatching(/^https:\/\/.+\/$/) },
      ]);
    }
  });

  it("assigns unique positive ids starting from RULE_ID_BASE", () => {
    const ids = rules.map((rule) => rule.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) {
      expect(id).toBeGreaterThanOrEqual(RULE_ID_BASE);
      expect(Number.isInteger(id)).toBe(true);
    }
  });

  it("restricts rewriting to image-like resource types", () => {
    for (const rule of rules) {
      expect(rule.condition.resourceTypes).toEqual(["image", "xmlhttprequest", "media"]);
    }
  });

  it("scopes each rule to its own domain only", () => {
    rules.forEach((rule, index) => {
      expect(rule.condition.requestDomains).toEqual([ANTI_HOTLINK_REFERERS[index].domain]);
    });
  });

  it("maps the docs.qq.com rule to the docs.qq.com referer", () => {
    const docsRule = rules.find((rule) => rule.condition.requestDomains?.includes("docs.qq.com"));
    expect(docsRule?.action.requestHeaders?.[0]?.value).toBe("https://docs.qq.com/");
  });
});
