/**
 * 搜狐号文章发布(experimental,待线上验证)
 *
 * 基于 aibeike 1.6.5 的 Sohu ARTICLE DOM fallback 路径实现。本环境无法登录目标平台验证,
 * 选择器/流程以参考实现为准,需线上回归。
 */
import type { ArticleData, SyncData } from "~sync/common";

export async function ArticleSohu(data: SyncData) {
  const articleData = data.data as ArticleData;

  function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  function waitForElement(selector: string, timeout = 15000): Promise<Element> {
    return new Promise((resolve, reject) => {
      const element = document.querySelector(selector);
      if (element) {
        resolve(element);
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
        reject(new Error(`Element with selector "${selector}" not found within ${timeout}ms`));
      }, timeout);
    });
  }

  function setControlValue(element: HTMLInputElement | HTMLTextAreaElement, value: string): void {
    const prototype =
      element instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
    const valueSetter = Object.getOwnPropertyDescriptor(prototype, "value")?.set;
    if (valueSetter) {
      valueSetter.call(element, value);
    } else {
      element.value = value;
    }
    element.dispatchEvent(new Event("input", { bubbles: true }));
    element.dispatchEvent(new Event("change", { bubbles: true }));
  }

  function clickPublishButton(): void {
    const candidates = Array.from(
      document.querySelectorAll("li.positive-button, button, [role='button']"),
    ) as HTMLElement[];
    const publishButton = candidates.find((element) => element.textContent?.trim().includes("发布"));
    if (publishButton) {
      publishButton.dispatchEvent(new Event("click", { bubbles: true }));
    } else {
      console.debug("搜狐号:未找到发布按钮");
    }
  }

  try {
    // TODO(待线上验证): Draft/image API path with Sohu auth headers not ported.
    await waitForElement('div[contenteditable="true"], div.ql-editor');
    await sleep(2000);

    const titleInput = document.querySelector(
      'input[placeholder="请输入标题（5-72字）"], input[placeholder*="标题"], textarea[placeholder*="标题"]',
    ) as HTMLInputElement | HTMLTextAreaElement | null;
    if (titleInput) {
      setControlValue(titleInput, articleData.title?.slice(0, 72) || "");
    } else {
      console.debug("搜狐号:未找到标题输入框");
    }

    const editor = document.querySelector(
      'div.ql-editor[contenteditable="true"], div.ql-editor, div[contenteditable="true"]',
    ) as HTMLElement | null;
    if (!editor) {
      console.debug("搜狐号:未找到 Quill 编辑器元素");
      return;
    }

    editor.focus();
    editor.innerHTML = articleData.htmlContent || "";
    editor.dispatchEvent(new Event("input", { bubbles: true }));
    editor.dispatchEvent(new Event("change", { bubbles: true }));
    await sleep(5000);

    if (data.isAutoPublish === true) {
      clickPublishButton();
    }
  } catch (error) {
    console.error("搜狐号文章发布出错:", error);
  }
}
