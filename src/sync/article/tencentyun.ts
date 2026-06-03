/**
 * 腾讯云文章发布(experimental,待线上验证)
 *
 * TencentYun ARTICLE 实现主要走 COS 签名上传 + 草稿 API。本实现按策略仅保留
 * DOM 填充路径。选择器/流程需线上回归。
 */
import type { ArticleData, SyncData } from "~sync/common";

export async function ArticleTencentyun(data: SyncData) {
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

  function findMarkdownTextarea(): HTMLTextAreaElement | null {
    const textareas = Array.from(document.querySelectorAll("textarea")) as HTMLTextAreaElement[];
    return (
      textareas.find((textarea) => textarea.classList.contains("textarea")) ||
      textareas.find((textarea) => {
        const placeholder = textarea.placeholder || "";
        return !placeholder.includes("标题") && !placeholder.includes("摘要") && textarea.clientHeight >= 80;
      }) ||
      null
    );
  }

  async function fillFallbackEditor(content: string): Promise<boolean> {
    const editor = document.querySelector(
      '.CodeMirror-code[role="presentation"], .monaco-editor textarea, [contenteditable="true"]',
    ) as HTMLElement | HTMLTextAreaElement | null;
    if (!editor) return false;

    editor.focus();
    if (editor instanceof HTMLTextAreaElement) {
      setControlValue(editor, content);
    } else {
      const pasteEvent = new ClipboardEvent("paste", {
        bubbles: true,
        cancelable: true,
        clipboardData: new DataTransfer(),
      });
      pasteEvent.clipboardData?.setData("text/plain", content);
      editor.dispatchEvent(pasteEvent);
      editor.dispatchEvent(new Event("input", { bubbles: true }));
      editor.dispatchEvent(new Event("change", { bubbles: true }));
    }
    return true;
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
      console.debug("腾讯云:未找到发布按钮");
    }
  }

  try {
    await waitForElement('input[placeholder*="标题"], textarea[placeholder*="标题"], textarea');
    await sleep(1000);

    const titleInput = document.querySelector('input[placeholder*="标题"], textarea[placeholder*="标题"]') as
      | HTMLInputElement
      | HTMLTextAreaElement
      | null;
    if (titleInput) {
      setControlValue(titleInput, articleData.title || "");
    } else {
      console.debug("腾讯云:未找到标题输入框");
    }

    const summaryInput = document.querySelector('textarea[placeholder*="摘要"], input[placeholder*="摘要"]') as
      | HTMLInputElement
      | HTMLTextAreaElement
      | null;
    if (summaryInput) {
      setControlValue(summaryInput, articleData.digest || "");
    }

    const content = articleData.markdownContent || articleData.htmlContent || "";
    const markdownTextarea = findMarkdownTextarea();
    if (markdownTextarea) {
      markdownTextarea.focus();
      setControlValue(markdownTextarea, content);
    } else {
      const filledFallback = await fillFallbackEditor(content);
      if (!filledFallback) {
        console.debug("腾讯云:未找到 Markdown 编辑器");
        return;
      }
    }

    if (data.isAutoPublish === true) {
      await clickPublishButton();
    }
  } catch (error) {
    console.error("腾讯云文章发布出错:", error);
  }
}
