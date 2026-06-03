/**
 * X 长文发布(experimental,待线上验证)
 *
 * aibeike 1.6.5 的 X ARTICLE 分支包含 GraphQL 草稿 API。本实现按策略仅保留 X Articles 页面
 * 的 DOM 填充路径。本环境无法登录目标平台验证,选择器/流程需线上回归。
 */
import type { ArticleData, SyncData } from "~sync/common";

export async function ArticleXArticle(data: SyncData) {
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

  function textMatches(element: Element, keywords: string[]): boolean {
    const ariaLabel = element.getAttribute("aria-label") || "";
    const placeholder = element.getAttribute("placeholder") || "";
    const testId = element.getAttribute("data-testid") || "";
    const joined = `${ariaLabel} ${placeholder} ${testId}`.toLowerCase();
    return keywords.some((keyword) => joined.includes(keyword.toLowerCase()));
  }

  function findTitleElement(): HTMLElement | HTMLInputElement | HTMLTextAreaElement | null {
    const directTitle = document.querySelector(
      'input[placeholder*="Title"], textarea[placeholder*="Title"], input[placeholder*="标题"], textarea[placeholder*="标题"], [contenteditable="true"][aria-label*="Title"], [contenteditable="true"][aria-label*="标题"]',
    ) as HTMLElement | HTMLInputElement | HTMLTextAreaElement | null;
    if (directTitle) return directTitle;

    const editables = Array.from(document.querySelectorAll('[contenteditable="true"], div[data-contents="true"]'));
    return (
      (editables.find((element) => textMatches(element, ["title", "标题"])) as HTMLElement | undefined) ||
      ((editables.length > 1 ? editables[0] : null) as HTMLElement | null) ||
      null
    );
  }

  function findBodyElement(titleElement: Element | null): HTMLElement | null {
    const directBody = document.querySelector(
      'div[data-contents="true"], [contenteditable="true"][aria-label*="Body"], [contenteditable="true"][aria-label*="article"], [contenteditable="true"][aria-label*="正文"]',
    ) as HTMLElement | null;
    if (directBody && directBody !== titleElement) return directBody;

    const editables = Array.from(document.querySelectorAll('[contenteditable="true"], div[data-contents="true"]'));
    return (
      (editables.find((element) => element !== titleElement && !textMatches(element, ["title", "标题"])) as
        | HTMLElement
        | undefined) || null
    );
  }

  function fillEditableText(element: HTMLElement, value: string): void {
    element.focus();
    element.textContent = value;
    element.dispatchEvent(new InputEvent("input", { bubbles: true, inputType: "insertText", data: value }));
    element.dispatchEvent(new Event("change", { bubbles: true }));
  }

  function pasteHtml(element: HTMLElement, html: string): void {
    element.focus();
    const pasteEvent = new ClipboardEvent("paste", {
      bubbles: true,
      cancelable: true,
      clipboardData: new DataTransfer(),
    });
    pasteEvent.clipboardData?.setData("text/html", html);
    pasteEvent.clipboardData?.setData("text/plain", html);
    element.dispatchEvent(pasteEvent);
    element.dispatchEvent(new Event("input", { bubbles: true }));
    element.dispatchEvent(new Event("change", { bubbles: true }));
  }

  async function clickPublishButton(bodyElement: HTMLElement): Promise<void> {
    await sleep(3000);
    const buttons = Array.from(document.querySelectorAll("button, [role='button']")) as HTMLButtonElement[];
    const publishButton = buttons.find((button) => {
      const text = button.textContent?.trim();
      return text === "Post" || text === "Publish" || text === "发帖" || text === "发布" || text === "發佈";
    });

    if (publishButton) {
      let attempts = 0;
      while (publishButton.disabled && attempts < 10) {
        await sleep(3000);
        attempts++;
      }

      if (!publishButton.disabled) {
        publishButton.dispatchEvent(new Event("click", { bubbles: true }));
      } else {
        console.debug("X 长文:发布按钮仍不可用");
      }
      return;
    }

    const isMac = /Mac|macOS|iPhone|iPod|iPad/.test(navigator.userAgent);
    const keyEvent = new KeyboardEvent("keydown", {
      bubbles: true,
      cancelable: true,
      key: "Enter",
      code: "Enter",
      keyCode: 13,
      which: 13,
      metaKey: isMac,
      ctrlKey: !isMac,
      composed: true,
    });
    bodyElement.focus();
    bodyElement.dispatchEvent(keyEvent);
  }

  try {
    // TODO(待线上验证): GraphQL draft API and signed media upload not ported.
    await waitForElement(
      '[contenteditable="true"], div[data-contents="true"], input[placeholder*="Title"], textarea[placeholder*="Title"], input[placeholder*="标题"], textarea[placeholder*="标题"]',
    );
    await sleep(1000);

    const titleElement = findTitleElement();
    if (titleElement instanceof HTMLInputElement || titleElement instanceof HTMLTextAreaElement) {
      setControlValue(titleElement, articleData.title || "");
    } else if (titleElement) {
      fillEditableText(titleElement, articleData.title || "");
    } else {
      console.debug("X 长文:未找到标题输入框");
    }

    const bodyElement = findBodyElement(titleElement);
    if (!bodyElement) {
      console.debug("X 长文:未找到正文编辑器");
      return;
    }

    pasteHtml(bodyElement, articleData.htmlContent || "");

    if (data.isAutoPublish === true) {
      await clickPublishButton(bodyElement);
    }
  } catch (error) {
    console.error("X 长文发布出错:", error);
  }
}
