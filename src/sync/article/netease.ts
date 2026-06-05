import type { ArticleData, SyncData } from "~sync/common";

/**
 * 网易号文章发布(experimental,待线上验证)
 *
 * 163 DOM 发布路径实现。选择器与流程需线上回归验证。
 *
 * 仅做 DOM 填充(标题 + 正文 paste + 封面自动 + 门控发布),不做正文图片的平台 CDN 重传——
 * 后者依赖页面内的 wemediaId / realUserId 凭证(硬编码账号对其他用户无效),
 * 属后续 API 化工作。
 */
export async function ArticleNetease(data: SyncData) {
  const articleData = data.data as ArticleData;

  function waitForElement(selector: string, timeout = 15000): Promise<Element> {
    return new Promise((resolve, reject) => {
      const exist = document.querySelector(selector);
      if (exist) {
        resolve(exist);
        return;
      }
      const observer = new MutationObserver(() => {
        const found = document.querySelector(selector);
        if (found) {
          observer.disconnect();
          resolve(found);
        }
      });
      observer.observe(document.body, { childList: true, subtree: true });
      setTimeout(() => {
        observer.disconnect();
        reject(new Error(`元素 "${selector}" 在 ${timeout}ms 内未出现`));
      }, timeout);
    });
  }

  // 网易号编辑器最高支持到 h5:把 h1-h4/h6 统一降级为 h5,避免标题样式丢失
  function normalizeHeadings(html: string): string {
    const doc = new DOMParser().parseFromString(html, "text/html");
    for (const heading of Array.from(doc.querySelectorAll("h1,h2,h3,h4,h6"))) {
      const h5 = document.createElement("h5");
      h5.innerHTML = heading.innerHTML;
      heading.parentNode?.replaceChild(h5, heading);
    }
    return doc.body.innerHTML;
  }

  try {
    // 标题(网易号限制 5~30 字)
    const titleInput = (await waitForElement('textarea[placeholder="请输入标题 (5~30个字)"]')) as HTMLTextAreaElement;
    await new Promise((resolve) => setTimeout(resolve, 1000));
    if (titleInput) {
      titleInput.value = articleData.title?.slice(0, 30) || "";
      titleInput.dispatchEvent(new Event("input", { bubbles: true }));
      titleInput.dispatchEvent(new Event("change", { bubbles: true }));
    }

    // 正文:网易号使用 Draft.js 编辑器(data-contents),通过 paste 注入 HTML
    const editor = (await waitForElement('div[data-contents="true"]')) as HTMLElement;
    if (!editor) {
      console.error("网易号:未找到正文编辑器");
      return;
    }
    editor.focus();
    const paste = new ClipboardEvent("paste", {
      bubbles: true,
      cancelable: true,
      clipboardData: new DataTransfer(),
    });
    paste.clipboardData?.setData("text/html", normalizeHeadings(articleData.htmlContent || ""));
    editor.dispatchEvent(paste);
    editor.dispatchEvent(new Event("input", { bubbles: true }));
    editor.dispatchEvent(new Event("change", { bubbles: true }));
    await new Promise((resolve) => setTimeout(resolve, 5000));

    // 封面设为"自动"
    const autoCover = Array.from(document.querySelectorAll("span.ne-switch-base-label-text")).find(
      (span) => span.textContent?.trim() === "自动",
    ) as HTMLElement | undefined;
    autoCover?.click();
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // 仅在用户开启自动发布时点击"发布";否则留给用户手动确认
    if (data.isAutoPublish === true) {
      const publishButton = Array.from(document.querySelectorAll("button")).find(
        (button) => button.textContent?.trim() === "发布",
      ) as HTMLButtonElement | undefined;
      if (publishButton) {
        publishButton.dispatchEvent(new Event("click", { bubbles: true }));
      } else {
        console.debug("网易号:未找到'发布'按钮");
      }
    }
  } catch (error) {
    console.error("网易号文章发布出错:", error);
  }
}
