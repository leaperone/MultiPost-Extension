/**
 * 阿里云文章发布(experimental,待线上验证)
 *
 * 基于 aibeike 1.6.5 的 Aliyun ARTICLE DOM 路径实现。本环境无法登录目标平台验证,
 * 选择器/流程以参考实现为准,需线上回归。
 */
import type { ArticleData, SyncData } from "~sync/common";

export async function ArticleAliyun(data: SyncData) {
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

  async function clickPublishButton(): Promise<void> {
    await sleep(1000);
    const buttons = Array.from(document.querySelectorAll("button, [role='button']")) as HTMLElement[];
    const publishButton = buttons.find((element) => {
      const text = element.textContent?.trim();
      return text === "发布" || text === "发布文章" || text?.includes("发布文章");
    });
    if (publishButton) {
      publishButton.dispatchEvent(new Event("click", { bubbles: true }));
    } else {
      console.debug("阿里云:未找到发布按钮");
    }
  }

  try {
    // TODO(待线上验证): API path with signed OSS image upload not ported.
    await waitForElement('input[placeholder="请填写标题"], textarea.textarea');
    await sleep(1000);

    const titleInput = document.querySelector('input[placeholder="请填写标题"]') as HTMLInputElement | null;
    if (titleInput) {
      setControlValue(titleInput, articleData.title || "");
    } else {
      console.debug("阿里云:未找到标题输入框");
    }

    const summaryTextarea = document.querySelector('textarea[placeholder="请填写摘要"]') as HTMLTextAreaElement | null;
    if (summaryTextarea) {
      setControlValue(summaryTextarea, articleData.digest || "");
    }

    const markdownTextarea = document.querySelector("textarea.textarea") as HTMLTextAreaElement | null;
    if (!markdownTextarea) {
      console.debug("阿里云:未找到 Markdown 编辑器 textarea");
      return;
    }

    markdownTextarea.focus();
    setControlValue(markdownTextarea, articleData.markdownContent || articleData.htmlContent || "");

    if (data.isAutoPublish === true) {
      await clickPublishButton();
    }
  } catch (error) {
    console.error("阿里云文章发布出错:", error);
  }
}
