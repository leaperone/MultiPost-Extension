import type { ArticleData, SyncData } from "~sync/common";

/**
 * 顶端号文章发布(experimental,待线上验证)
 *
 * 基于 aibeike 1.6.5 的 Dingduanhao ARTICLE DOM 发布路径实现。本环境无法登录目标平台验证,
 * 选择器/流程以参考实现为准,需线上回归。
 */
export async function ArticleDingduanhao(data: SyncData) {
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

    const coverRadio = Array.from(document.querySelectorAll("span.el-radio__label")).find((element) =>
      element.textContent?.includes("小封面"),
    ) as HTMLElement | undefined;
    if (coverRadio) {
      coverRadio.click();
      await sleep(1000);
    }

    const fileInput = document.querySelector("input#upload") as HTMLInputElement | null;
    if (!fileInput) {
      console.debug("顶端号:未找到封面上传元素");
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
    await waitForElement("input");
    await sleep(1000);

    const clearButton = document.querySelector("a.oprt") as HTMLElement | null;
    if (clearButton) {
      clearButton.click();
      await sleep(1000);
    }

    const titleInput = document.querySelector('input[placeholder="请输入标题文字(2-35字)"]') as HTMLInputElement | null;
    if (titleInput) {
      titleInput.value = articleData.title?.slice(0, 35) || "";
      titleInput.dispatchEvent(new Event("input", { bubbles: true }));
      titleInput.dispatchEvent(new Event("change", { bubbles: true }));
    }

    const summaryTextarea = document.querySelector('textarea[placeholder="请输入摘要"]') as HTMLTextAreaElement | null;
    if (summaryTextarea) {
      summaryTextarea.value = articleData.digest?.slice(0, 128) || "";
      summaryTextarea.dispatchEvent(new Event("input", { bubbles: true }));
      summaryTextarea.dispatchEvent(new Event("change", { bubbles: true }));
    }

    const editor = document.querySelector('div[contenteditable="true"]') as HTMLElement | null;
    if (!editor) {
      console.debug("顶端号:未找到编辑器元素");
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
      console.debug("顶端号:未找到发布按钮");
    }
  } catch (error) {
    console.error("顶端号文章发布出错:", error);
  }
}
