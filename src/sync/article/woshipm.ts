import type { ArticleData, FileData, SyncData } from "../common";

export async function ArticleWoshipm(data: SyncData) {
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

  function queryFirstElement<T extends Element>(selectors: string[]): T | null {
    for (const selector of selectors) {
      const element = document.querySelector(selector) as T | null;
      if (element) return element;
    }
    return null;
  }

  async function createFile(fileData: FileData): Promise<File | null> {
    try {
      const response = await fetch(fileData.url);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const blob = await response.blob();
      return new File([blob], fileData.name, { type: fileData.type || blob.type || "application/octet-stream" });
    } catch (error) {
      console.warn("Woshipm cover file fetch failed:", error);
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

  function getIframeEditorBody(): HTMLElement | null {
    const iframe = document.querySelector("iframe#post_content_ifr") as HTMLIFrameElement | null;
    if (!iframe) return null;

    try {
      return iframe.contentDocument?.body || null;
    } catch (error) {
      console.debug("Woshipm iframe editor is not accessible:", error);
      return null;
    }
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

  function tickCheckbox(selector: string): void {
    const checkbox = document.querySelector(selector) as HTMLInputElement | null;
    if (!checkbox) {
      console.debug(`Woshipm checkbox not found: ${selector}`);
      return;
    }

    if (!checkbox.checked) {
      checkbox.click();
    }
  }

  async function uploadCover(cover?: FileData): Promise<boolean> {
    if (!cover) return true;
    if (!cover.url) {
      console.debug("Woshipm cover data has no URL");
      return false;
    }

    const selector = 'input[type="file"][class="preview__input"], input[type="file"].preview__input';
    const fileInput = (document.querySelector(selector) ||
      (await waitForElementOptional(selector, 3000))) as HTMLInputElement | null;
    if (!fileInput) {
      console.debug("Woshipm cover upload input not found");
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
      console.error(`Woshipm required field ${field} not filled; skipping auto-publish to avoid an incomplete article`);
    }

    return missing.length === 0;
  }

  function clickPublishIfRequested(required: { title: boolean; body: boolean; cover: boolean }): void {
    if (data.isAutoPublish === true && !canAutoPublish(required)) {
      return;
    }

    const publishButton = document.querySelector(
      "div.button_publish.item.editor-btn.editor-main-btn",
    ) as HTMLElement | null;
    if (!publishButton) {
      console.debug("Woshipm publish button not found");
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

    await waitForElementOptional('input#post_title, input[placeholder*="标题"], textarea[placeholder*="标题"]');
    const titleEl = queryFirstElement<HTMLInputElement | HTMLTextAreaElement>([
      "input#post_title",
      'input[placeholder*="标题"]',
      'textarea[placeholder*="标题"]',
    ]);
    if (titleEl && title) {
      try {
        titleEl.focus();
        titleEl.value = title.slice(0, 40);
        dispatchInputEvents(titleEl);
        required.title = true;
      } catch (error) {
        console.error("Woshipm title write failed:", error);
      }
    } else {
      console.debug("Woshipm title input not found");
    }

    const editor =
      getIframeEditorBody() ||
      (document.querySelector(
        'div[contenteditable="true"], div.w-e-text[contenteditable="true"], div.w-e-text',
      ) as HTMLDivElement | null);
    if (editor) {
      try {
        pasteHtml(editor, htmlContent || "");
        required.body = true;
      } catch (error) {
        console.error("Woshipm body write failed:", error);
      }
    } else {
      console.debug("Woshipm body editor not found");
    }

    tickCheckbox('input[type="checkbox"][name="copyright"]');
    tickCheckbox('input[type="checkbox"][name="copyright_other"]');
    tickCheckbox('input[type="checkbox"][name="copyright_pm"]');
    try {
      required.cover = await uploadCover(cover);
    } catch (error) {
      console.error("Woshipm cover upload failed:", error);
      required.cover = false;
    }
    clickPublishIfRequested(required);
  } catch (error) {
    console.error("人人都是产品经理文章发布失败:", error);
  }
}
