import type { ArticleData, SyncData } from "~sync/common";

/**
 * 一点资讯文章发布(experimental,待线上验证)
 *
 * 基于 aibeike 1.6.5 的 Yidianzixun ARTICLE DOM 发布路径实现。本环境无法登录目标平台验证,
 * 选择器/流程以参考实现为准,需线上回归。
 */
export async function ArticleYidianzixun(data: SyncData) {
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

  async function uploadCover(): Promise<boolean> {
    if (!articleData.cover?.url) return true;

    const fileInput = document.querySelector("input.upload-input-not-found") as HTMLInputElement | null;
    if (!fileInput) {
      console.debug("一点资讯:未找到封面上传元素");
      return false;
    }

    const dataTransfer = new DataTransfer();
    const response = await fetch(articleData.cover.url);
    const arrayBuffer = await response.arrayBuffer();
    const file = new File([arrayBuffer], articleData.cover.name, { type: articleData.cover.type });
    dataTransfer.items.add(file);

    if (dataTransfer.files.length > 0) {
      fileInput.files = dataTransfer.files;
      fileInput.dispatchEvent(new Event("change", { bubbles: true }));
      fileInput.dispatchEvent(new Event("input", { bubbles: true }));
      await sleep(3000);
    }

    return true;
  }

  try {
    await waitForElement("input.post-title");
    await sleep(1000);

    const clearButton = document.querySelector("a.oprt") as HTMLElement | null;
    if (clearButton) {
      clearButton.click();
      await sleep(1000);
    }

    const titleInput = document.querySelector("input.post-title") as HTMLInputElement | null;
    if (titleInput) {
      titleInput.value = articleData.title?.slice(0, 64) || "";
      titleInput.dispatchEvent(new Event("input", { bubbles: true }));
      titleInput.dispatchEvent(new Event("change", { bubbles: true }));
    }

    const editor = document.querySelector('div.editor-content[contenteditable="true"]') as HTMLElement | null;
    if (!editor) {
      console.debug("一点资讯:未找到编辑器元素");
      return;
    }

    editor.focus();
    const pasteEvent = new ClipboardEvent("paste", {
      bubbles: true,
      cancelable: true,
      clipboardData: new DataTransfer(),
    });
    pasteEvent.clipboardData?.setData("text/html", articleData.htmlContent || "");
    editor.dispatchEvent(pasteEvent);
    editor.dispatchEvent(new Event("input", { bubbles: true }));
    editor.dispatchEvent(new Event("change", { bubbles: true }));

    const coverUploaded = await uploadCover();
    if (!coverUploaded) return;

    const publishButton = document.querySelector(
      "div.button_publish.item.editor-btn.editor-main-btn",
    ) as HTMLElement | null;
    if (publishButton && data.isAutoPublish === true) {
      publishButton.dispatchEvent(new Event("click", { bubbles: true }));
    } else if (!publishButton) {
      console.debug("一点资讯:未找到发布按钮");
    }
  } catch (error) {
    console.error("一点资讯文章发布出错:", error);
  }
}
