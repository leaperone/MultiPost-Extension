import type { ArticleData, FileData, SyncData } from "../common";

export async function ArticleOSChina(data: SyncData) {
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
      console.warn("OSChina cover file fetch failed:", error);
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

  function getAccessibleIframeBody(iframe: HTMLIFrameElement): HTMLElement | null {
    try {
      return iframe.contentDocument?.body || null;
    } catch (error) {
      console.debug("OSChina iframe editor is not accessible:", error);
      return null;
    }
  }

  function getIframeEditorBody(): HTMLElement | null {
    const explicitEditorIframeSelectors = [
      'iframe[id*="ueditor"]',
      'iframe[name*="ueditor"]',
      '[class*="editor"] iframe[id*="ueditor"]',
      '[class*="editor"] iframe[name*="ueditor"]',
    ];

    for (const selector of explicitEditorIframeSelectors) {
      const iframe = document.querySelector(selector) as HTMLIFrameElement | null;
      if (!iframe) continue;
      const body = getAccessibleIframeBody(iframe);
      if (body) return body;
    }

    const editorRegionIframeSelectors = [
      '[class*="editor"] iframe',
      '[id*="editor"] iframe',
      ".editor-container iframe",
      ".editor-main iframe",
    ];

    for (const selector of editorRegionIframeSelectors) {
      const iframe = document.querySelector(selector) as HTMLIFrameElement | null;
      if (!iframe) continue;
      try {
        const iframeDocument = iframe.contentDocument;
        const body = iframeDocument?.body || null;
        const designMode = iframeDocument?.designMode?.toLowerCase();
        const writable =
          body?.isContentEditable || body?.getAttribute("contenteditable") === "true" || designMode === "on";
        if (body && writable) return body;
      } catch (error) {
        console.debug("OSChina iframe editor is not accessible:", error);
      }
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

  async function uploadCover(cover?: FileData): Promise<boolean> {
    if (!cover) return true;
    if (!cover.url) {
      console.debug("OSChina cover data has no URL");
      return false;
    }

    const selector = 'input[type="file"][class="preview__input"], input[type="file"].preview__input';
    const fileInput = (document.querySelector(selector) ||
      (await waitForElementOptional(selector, 3000))) as HTMLInputElement | null;
    if (!fileInput) {
      console.debug("OSChina cover upload input not found");
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
      console.error(`OSChina required field ${field} not filled; skipping auto-publish to avoid an incomplete article`);
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
      console.debug("OSChina publish button not found");
      return;
    }

    if (data.isAutoPublish === true) {
      publishButton.dispatchEvent(new Event("click", { bubbles: true }));
    }
  }

  // OSChina relays inline images to its own CDN.
  async function uploadImage(file: FileData): Promise<string | null> {
    try {
      const blob = await (await fetch(file.url)).blob();
      const form = new FormData();
      form.append("file", new File([blob], file.name, { type: file.type || blob.type }));

      const resp = await fetch("https://apiv1.oschina.net/oschinapi/ai/creation/project/uploadDetail", {
        method: "POST",
        body: form,
        credentials: "include",
      });
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const json = (await resp.json()) as { result?: string };
      return json?.result || null;
    } catch (e) {
      console.warn("OSChina 图片上传失败", file.url, e);
      return null;
    }
  }

  async function rewriteImages(html: string, images: FileData[]): Promise<string> {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, "text/html");
    const imgs = Array.from(doc.getElementsByTagName("img"));
    for (let i = 0; i < imgs.length; i++) {
      const src = imgs[i].getAttribute("src");
      if (!src) continue;
      const match = images.find((f) => f.url === src);
      if (!match) continue;
      const newUrl = await uploadImage(match);
      if (newUrl) imgs[i].setAttribute("src", newUrl);
    }
    return doc.body.innerHTML;
  }

  try {
    const { title, htmlContent, images = [], cover } = data.data as ArticleData;
    const required = {
      title: false,
      body: false,
      cover: !cover,
    };

    await waitForElementOptional('input[placeholder*="标题"], textarea[placeholder*="标题"], input[name="title"]');

    const titleEl = queryFirstElement<HTMLInputElement | HTMLTextAreaElement>([
      'input[placeholder*="标题"]',
      'textarea[placeholder*="标题"]',
      'input[name="title"]',
    ]);
    if (titleEl && title) {
      try {
        titleEl.focus();
        titleEl.value = title;
        dispatchInputEvents(titleEl);
        required.title = true;
      } catch (error) {
        console.error("OSChina title write failed:", error);
      }
    } else {
      console.debug("OSChina title input not found");
    }

    const processed = await rewriteImages(htmlContent || "", images);
    const editor =
      getIframeEditorBody() || (document.querySelector('div[contenteditable="true"]') as HTMLDivElement | null);
    if (editor) {
      try {
        pasteHtml(editor, processed);
        required.body = true;
      } catch (error) {
        console.error("OSChina body write failed:", error);
      }
    } else {
      console.debug("OSChina body editor not found");
    }

    try {
      required.cover = await uploadCover(cover);
    } catch (error) {
      console.error("OSChina cover upload failed:", error);
      required.cover = false;
    }
    clickPublishIfRequested(required);
  } catch (error) {
    console.error("OSChina 文章发布失败:", error);
  }
}
