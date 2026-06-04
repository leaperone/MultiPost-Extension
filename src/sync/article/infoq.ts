import type { ArticleData, FileData, SyncData } from "../common";

export async function ArticleInfoQ(data: SyncData) {
  function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

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
        reject(new Error(`Element "${selector}" was not found within ${timeout}ms`));
      }, timeout);
    });
  }

  async function waitForElementOptional(selector: string, timeout = 15000): Promise<Element | null> {
    return waitForElement(selector, timeout).catch(() => null);
  }

  function dispatchInputEvents(element: HTMLElement): void {
    element.dispatchEvent(new Event("input", { bubbles: true }));
    element.dispatchEvent(new Event("change", { bubbles: true }));
  }

  async function createFile(fileData: FileData): Promise<File | null> {
    try {
      const response = await fetch(fileData.url);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const blob = await response.blob();
      return new File([blob], fileData.name, { type: fileData.type || blob.type || "application/octet-stream" });
    } catch (error) {
      console.warn("InfoQ cover file fetch failed:", error);
      return null;
    }
  }

  async function setFileInput(fileInput: HTMLInputElement, fileData: FileData): Promise<boolean> {
    const file = await createFile(fileData);
    if (!file) return false;

    const dataTransfer = new DataTransfer();
    dataTransfer.items.add(file);
    if (dataTransfer.files.length === 0) return false;

    fileInput.files = dataTransfer.files;
    dispatchInputEvents(fileInput);
    return true;
  }

  function pasteHtml(editor: HTMLElement, html: string): void {
    editor.focus();
    const paste = new ClipboardEvent("paste", {
      bubbles: true,
      cancelable: true,
      clipboardData: new DataTransfer(),
    });
    paste.clipboardData?.setData("text/html", html);
    editor.dispatchEvent(paste);
    dispatchInputEvents(editor);
  }

  async function uploadCover(cover?: FileData): Promise<boolean> {
    if (!cover) return true;
    if (!cover.url) {
      console.debug("InfoQ cover data has no URL");
      return false;
    }

    const selector = 'div.upload-hander > input[type="file"]';
    const fileInput = (document.querySelector(selector) ||
      (await waitForElementOptional(selector, 3000))) as HTMLInputElement | null;
    if (!fileInput) {
      console.debug("InfoQ cover upload input not found");
      return false;
    }

    const uploaded = await setFileInput(fileInput, cover);
    if (uploaded) {
      await sleep(3000);
      return true;
    }
    return false;
  }

  function canAutoPublish(required: { title: boolean; body: boolean; cover: boolean }): boolean {
    const missing = [
      ["title", required.title],
      ["body", required.body],
      ["cover", required.cover],
    ].filter(([, filled]) => !filled);

    for (const [field] of missing) {
      console.error(`InfoQ required field ${field} not filled; skipping auto-publish to avoid an incomplete article`);
    }

    return missing.length === 0;
  }

  function clickPublishIfRequested(required: { title: boolean; body: boolean; cover: boolean }): void {
    if (data.isAutoPublish === true && !canAutoPublish(required)) {
      return;
    }

    const publishButton = Array.from(document.querySelectorAll<HTMLButtonElement>("button")).find((button) => {
      const text = button.textContent || "";
      return text.includes(" 发布 ") || text.trim() === "发布";
    });

    if (!publishButton) {
      console.debug("InfoQ publish button not found");
      return;
    }

    if (data.isAutoPublish === true) {
      publishButton.dispatchEvent(new Event("click", { bubbles: true }));
    }
  }

  try {
    const { title, htmlContent, cover } = data.data as ArticleData;
    const required = {
      title: false,
      body: false,
      cover: !cover,
    };

    const writeBtn = (document.querySelector("div.write-btn, .write-btn") ||
      (await waitForElementOptional(".write-btn", 5000))) as HTMLElement | null;
    if (writeBtn) {
      await sleep(500);
      writeBtn.click();
      await sleep(1200);
    } else {
      console.debug("InfoQ write button not found");
    }

    await waitForElementOptional('input[placeholder*="标题"]');
    const titleEl = document.querySelector('input[placeholder*="标题"]') as HTMLInputElement | null;
    if (titleEl && title) {
      try {
        titleEl.focus();
        titleEl.value = title.slice(0, 100);
        dispatchInputEvents(titleEl);
        required.title = true;
      } catch (error) {
        console.error("InfoQ title write failed:", error);
      }
    } else {
      console.debug("InfoQ title input not found");
    }

    const editor = document.querySelector('div.ProseMirror[contenteditable="true"]') as HTMLDivElement | null;
    if (editor) {
      try {
        editor.click();
        pasteHtml(editor, htmlContent || "");
        required.body = true;
      } catch (error) {
        console.error("InfoQ body write failed:", error);
      }
    } else {
      console.debug("InfoQ ProseMirror editor not found");
    }

    try {
      required.cover = await uploadCover(cover);
    } catch (error) {
      console.error("InfoQ cover upload failed:", error);
      required.cover = false;
    }
    clickPublishIfRequested(required);
  } catch (error) {
    console.error("InfoQ 文章发布失败:", error);
  }
}
