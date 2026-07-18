import type { ArticleData, SyncData } from "../types";

export async function ArticleMedium(data: SyncData) {
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
        reject(new Error(`Element "${selector}" not found within ${timeout}ms`));
      }, timeout);
    });
  }

  function setContentEditableText(editor: HTMLElement, target: HTMLElement, value: string): void {
    if (!value) return;

    editor.focus();
    const selection = window.getSelection();
    if (!selection) return;

    const selectTarget = () => {
      const range = document.createRange();
      range.selectNodeContents(target);
      selection.removeAllRanges();
      selection.addRange(range);
    };

    selectTarget();
    document.execCommand("insertText", false, value);
    if (target.textContent !== value) {
      selectTarget();
      const paste = new ClipboardEvent("paste", {
        bubbles: true,
        cancelable: true,
        clipboardData: new DataTransfer(),
      });
      paste.clipboardData?.setData("text/plain", value);
      editor.dispatchEvent(paste);
    }

    editor.dispatchEvent(new InputEvent("input", { bubbles: true, inputType: "insertText", data: value }));
    editor.dispatchEvent(new Event("change", { bubbles: true }));
  }

  try {
    const { title, htmlContent } = data.data as ArticleData;

    await waitForElement("span.defaultValue.defaultValue--root");
    await new Promise((resolve) => setTimeout(resolve, 800));

    // Medium 标题与正文都是 contenteditable；标题是 h3，正文是文章主体 div。
    const titleEl = document.querySelector("h3[data-testid='editorTitleParagraph']") as HTMLElement | null;
    if (titleEl && title) {
      setContentEditableText(
        (titleEl.closest('[contenteditable="true"]') as HTMLElement | null) || titleEl,
        titleEl,
        title,
      );
    }

    const editor = document.querySelector('div[contenteditable="true"]') as HTMLDivElement | null;
    if (!editor) {
      console.error("未找到 Medium 正文编辑器");
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

    if (data.isAutoPublish) {
      const publishBtn = document.querySelector(
        "div.button_publish.item.editor-btn.editor-main-btn",
      ) as HTMLElement | null;
      publishBtn?.dispatchEvent(new Event("click", { bubbles: true }));
    }
  } catch (error) {
    console.error("Medium 文章发布失败:", error);
  }
}
