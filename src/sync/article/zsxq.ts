import type { ArticleData, SyncData } from "~sync/common";

/**
 * 知识星球文章发布(experimental,待线上验证)
 *
 * Zsxq ARTICLE DOM 发布路径实现。选择器与流程需线上回归验证。
 */
export async function ArticleZsxq(data: SyncData) {
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

  try {
    await waitForElement('div[contenteditable="true"]');
    await sleep(1000);

    const titleInput = document.querySelector('input[placeholder="请在这里输入标题"]') as HTMLInputElement | null;
    if (titleInput) {
      titleInput.value = articleData.title?.slice(0, 60) || "";
      titleInput.dispatchEvent(new Event("input", { bubbles: true }));
      titleInput.dispatchEvent(new Event("change", { bubbles: true }));
    }

    const editor = document.querySelector('div[contenteditable="true"]') as HTMLElement | null;
    if (!editor) {
      console.debug("知识星球:未找到编辑器元素");
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
    await sleep(5000);

    const publishButton = Array.from(document.querySelectorAll("div.post.btn")).find(
      (element) => element.textContent?.trim() === "发布",
    ) as HTMLElement | undefined;
    if (publishButton && data.isAutoPublish === true) {
      publishButton.dispatchEvent(new Event("click", { bubbles: true }));
    } else if (!publishButton) {
      console.debug("知识星球:未找到发布按钮");
    }
  } catch (error) {
    console.error("知识星球文章发布出错:", error);
  }
}
