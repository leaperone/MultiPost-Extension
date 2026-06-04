import type { ArticleData, FileData, SyncData } from "../common";

export async function ArticleAutohome(data: SyncData) {
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

  async function createFile(fileData: FileData): Promise<File | null> {
    try {
      const response = await fetch(fileData.url);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const blob = await response.blob();
      return new File([blob], fileData.name, { type: fileData.type || blob.type || "application/octet-stream" });
    } catch (error) {
      console.warn("Autohome cover file fetch failed:", error);
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

  function setCheckbox(selector: string, checked: boolean): void {
    const checkbox = document.querySelector(selector) as HTMLInputElement | null;
    if (!checkbox) {
      console.debug(`Autohome checkbox not found: ${selector}`);
      return;
    }

    if (checkbox.checked !== checked) {
      checkbox.click();
    }
  }

  async function uploadCover(cover?: FileData): Promise<boolean> {
    if (!cover) return true;
    if (!cover.url) {
      console.debug("Autohome cover data has no URL");
      return false;
    }

    const editCoverButton = Array.from(document.querySelectorAll<HTMLElement>("span")).find(
      (span) => span.textContent === "编辑",
    );
    if (!editCoverButton) {
      console.debug("Autohome cover edit button not found");
      return false;
    }

    editCoverButton.click();
    const iframe = (await waitForElementOptional("iframe[name='mofangIframe']", 5000)) as HTMLIFrameElement | null;
    const iframeDocument = iframe?.contentDocument || null;
    if (!iframeDocument) {
      console.debug("Autohome cover iframe not found");
      return false;
    }

    const fileInput = (iframeDocument.querySelector('input[accept="image/*"]') ||
      (await new Promise<HTMLInputElement | null>((resolve) => {
        const exist = iframeDocument.querySelector('input[accept="image/*"]') as HTMLInputElement | null;
        if (exist) {
          resolve(exist);
          return;
        }
        const observer = new MutationObserver(() => {
          const found = iframeDocument.querySelector('input[accept="image/*"]') as HTMLInputElement | null;
          if (found) {
            observer.disconnect();
            resolve(found);
          }
        });
        observer.observe(iframeDocument.body, { childList: true, subtree: true });
        setTimeout(() => {
          observer.disconnect();
          resolve(null);
        }, 5000);
      }))) as HTMLInputElement | null;
    if (!fileInput) {
      console.debug("Autohome cover upload input not found");
      return false;
    }

    const uploaded = await setFileInput(fileInput, cover);
    if (!uploaded) return false;

    await sleep(3000);
    const doneButton = Array.from(iframeDocument.querySelectorAll<HTMLElement>("span")).find(
      (span) => span.textContent === "完成制作",
    );
    if (doneButton) {
      doneButton.click();
    } else {
      console.debug("Autohome cover done button not found");
      return false;
    }

    return true;
  }

  function canAutoPublish(required: { title: boolean; body: boolean; cover: boolean }): boolean {
    const missing = [
      ["title", required.title],
      ["body", required.body],
      ["cover", required.cover],
    ].filter(([, filled]) => !filled);

    for (const [field] of missing) {
      console.error(
        `Autohome required field ${field} not filled; skipping auto-publish to avoid an incomplete article`,
      );
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
      console.debug("Autohome publish button not found");
      return;
    }

    if (data.isAutoPublish === true) {
      publishButton.dispatchEvent(new Event("click", { bubbles: true }));
    }
  }

  try {
    const articleData = data.data as ArticleData;
    const { title, htmlContent, cover } = articleData;
    const required = {
      title: false,
      body: false,
      cover: !cover,
    };

    await waitForElementOptional(
      'input[placeholder*="标题"], textarea[placeholder*="标题"], input[placeholder="请输入文章标题(6-30个汉字)"]',
    );
    const titleEl = queryFirstElement<HTMLInputElement | HTMLTextAreaElement>([
      'input[placeholder*="标题"]',
      'textarea[placeholder*="标题"]',
      'input[placeholder="请输入文章标题(6-30个汉字)"]',
    ]);
    if (titleEl && title) {
      try {
        titleEl.focus();
        titleEl.value = title.slice(0, 60);
        dispatchInputEvents(titleEl);
        required.title = true;
      } catch (error) {
        console.error("Autohome title write failed:", error);
      }
    } else {
      console.debug("Autohome title input not found");
    }

    const editor = document.querySelector('div[contenteditable="true"]') as HTMLDivElement | null;
    if (editor) {
      try {
        pasteHtml(editor, htmlContent || "");
        required.body = true;
      } catch (error) {
        console.error("Autohome body write failed:", error);
      }
    } else {
      console.debug("Autohome body editor not found");
    }

    setCheckbox("input#isOriginal", articleData.original ?? true);
    const firstPublishRequested =
      (articleData as ArticleData & { isFirst?: boolean; firstPublish?: boolean }).isFirst === true ||
      (articleData as ArticleData & { isFirst?: boolean; firstPublish?: boolean }).firstPublish === true;
    // 首发与原创互斥：非原创内容绝不勾选首发，避免平台校验冲突
    if (articleData.original !== false && (articleData.original === true || firstPublishRequested)) {
      setCheckbox("input#isFirst", true);
    }
    await sleep(300);
    try {
      required.cover = await uploadCover(cover);
    } catch (error) {
      console.error("Autohome cover upload failed:", error);
      required.cover = false;
    }
    clickPublishIfRequested(required);
  } catch (error) {
    console.error("汽车之家文章发布失败:", error);
  }
}
