import type { ArticleData, SyncData } from "../common";

export async function ArticleInfoQ(data: SyncData) {
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

    // InfoQ 首页要先点"写文章"才进入编辑器
    await waitForElement(".write-btn");
    await new Promise((resolve) => setTimeout(resolve, 500));
    const writeBtn = document.querySelector("div.write-btn, .write-btn") as HTMLElement | null;
    if (!writeBtn) throw new Error("未找到 InfoQ 写文章按钮");
    writeBtn.click();
    await new Promise((resolve) => setTimeout(resolve, 1200));

    await waitForElement('input[placeholder*="标题"]');
    const titleEl = document.querySelector('input[placeholder*="标题"]') as HTMLInputElement | null;
    if (titleEl && title) {
      titleEl.focus();
      titleEl.value = title.slice(0, 100);
      titleEl.dispatchEvent(new Event("input", { bubbles: true }));
      titleEl.dispatchEvent(new Event("change", { bubbles: true }));
    }

    const editor = document.querySelector('div.ProseMirror[contenteditable="true"]') as HTMLDivElement | null;
    if (!editor) {
      console.error("未找到 InfoQ ProseMirror 编辑器");
      return;
    }
    editor.click();
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
    console.error("InfoQ 文章发布失败:", error);
  }
}
