import type { ArticleData, SyncData } from "../types";

/**
 * 火山引擎开发者社区文章填充。
 *
 * 当前仅填入标题和正文，不自动提交，便于用户在发布前检查格式。
 */
export async function ArticleVolcengine(data: SyncData) {
  if (data.isAutoPublish) {
    throw new Error("火山引擎文章暂不支持自动发布，请关闭自动发布后重试");
  }

  const articleData = data.data as ArticleData;

  function waitForElement(selector: string, timeout = 15000): Promise<Element> {
    return new Promise((resolve, reject) => {
      const existing = document.querySelector(selector);
      if (existing) {
        resolve(existing);
        return;
      }

      const observer = new MutationObserver(() => {
        const element = document.querySelector(selector);
        if (element) {
          observer.disconnect();
          resolve(element);
        }
      });
      observer.observe(document.body, { childList: true, subtree: true });

      setTimeout(() => {
        observer.disconnect();
        reject(new Error(`Element with selector "${selector}" not found within ${timeout}ms`));
      }, timeout);
    });
  }

  try {
    const titleInput = (await waitForElement('input[placeholder="请输入文章标题，50个字符以内"]')) as HTMLInputElement;
    titleInput.value = articleData.title || "";
    titleInput.dispatchEvent(new Event("input", { bubbles: true }));
    titleInput.dispatchEvent(new Event("change", { bubbles: true }));

    const editor = (await waitForElement("div.CodeMirror-scroll")) as HTMLElement;
    editor.focus();
    const pasteEvent = new ClipboardEvent("paste", {
      bubbles: true,
      cancelable: true,
      clipboardData: new DataTransfer(),
    });
    pasteEvent.clipboardData?.setData("text/html", articleData.htmlContent || "");
    pasteEvent.clipboardData?.setData("text/plain", articleData.markdownContent || "");
    editor.dispatchEvent(pasteEvent);
    editor.dispatchEvent(new Event("input", { bubbles: true }));
    editor.dispatchEvent(new Event("change", { bubbles: true }));
  } catch (error) {
    console.error("火山引擎文章填充失败:", error);
  }
}
