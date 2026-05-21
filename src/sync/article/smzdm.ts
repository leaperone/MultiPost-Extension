import type { ArticleData, SyncData } from "../common";

export async function ArticleSMZDM(data: SyncData) {
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

  // 什么值得买的编辑器会校验图片是否带 alt（带 alt 视为外链），上传前先剥离
  function stripImgAlt(html: string): string {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, "text/html");
    for (const img of Array.from(doc.getElementsByTagName("img"))) {
      img.removeAttribute("alt");
    }
    return doc.body.innerHTML;
  }

  try {
    const { title, htmlContent } = data.data as ArticleData;

    await waitForElement('textarea[placeholder*="标题"]');
    const titleEl = document.querySelector('textarea[placeholder*="标题"]') as HTMLTextAreaElement | null;
    if (titleEl && title) {
      titleEl.focus();
      titleEl.value = title.slice(0, 100);
      titleEl.dispatchEvent(new Event("input", { bubbles: true }));
      titleEl.dispatchEvent(new Event("change", { bubbles: true }));
    }

    const editor = document.querySelector('div.ProseMirror[contenteditable="true"]') as HTMLDivElement | null;
    if (!editor) {
      console.error("未找到 SMZDM ProseMirror 编辑器");
      return;
    }
    editor.focus();
    editor.innerHTML = "";
    await new Promise((resolve) => setTimeout(resolve, 600));
    editor.click();

    const paste = new ClipboardEvent("paste", {
      bubbles: true,
      cancelable: true,
      clipboardData: new DataTransfer(),
    });
    paste.clipboardData?.setData("text/html", stripImgAlt(htmlContent || ""));
    editor.dispatchEvent(paste);
    editor.dispatchEvent(new Event("input", { bubbles: true }));
    editor.dispatchEvent(new Event("change", { bubbles: true }));
  } catch (error) {
    console.error("什么值得买文章发布失败:", error);
  }
}
