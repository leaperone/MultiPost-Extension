import type { ArticleData, SyncData } from "../common";

export async function ArticleAutohome(data: SyncData) {
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

  try {
    const { title, htmlContent } = data.data as ArticleData;

    await waitForElement('input[placeholder*="标题"], textarea[placeholder*="标题"]');
    const titleEl = document.querySelector('input[placeholder*="标题"], textarea[placeholder*="标题"]') as
      | HTMLInputElement
      | HTMLTextAreaElement
      | null;
    if (titleEl && title) {
      titleEl.focus();
      titleEl.value = title.slice(0, 60);
      titleEl.dispatchEvent(new Event("input", { bubbles: true }));
      titleEl.dispatchEvent(new Event("change", { bubbles: true }));
    }

    const editor = document.querySelector('div[contenteditable="true"]') as HTMLDivElement | null;
    if (!editor) {
      console.error("未找到汽车之家正文编辑器");
      return;
    }
    editor.focus();
    const paste = new ClipboardEvent("paste", {
      bubbles: true,
      cancelable: true,
      clipboardData: new DataTransfer(),
    });
    paste.clipboardData?.setData("text/html", htmlContent || "");
    editor.dispatchEvent(paste);
    editor.dispatchEvent(new Event("input", { bubbles: true }));
    editor.dispatchEvent(new Event("change", { bubbles: true }));
  } catch (error) {
    console.error("汽车之家文章发布失败:", error);
  }
}
