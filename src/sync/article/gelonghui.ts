import type { ArticleData, FileData, SyncData } from "~sync/common";

/**
 * Gelonghui article publishing (experimental).
 *
 * DOM path. This still needs live validation on the target platform.
 */
export async function ArticleGeLongHui(data: SyncData) {
  const articleData = data.data as ArticleData;

  interface ImageUploadResult {
    result?: string;
  }

  interface RequiredFields {
    title: boolean;
    body: boolean;
    bodyFullyPrepared: boolean;
    cover: boolean;
  }

  interface InlineImageRewriteResult {
    htmlContent: string;
    isFullyPrepared: boolean;
  }

  function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  function waitForElementOptional(selector: string, timeout = 15000): Promise<Element | null> {
    return new Promise((resolve) => {
      const element = document.querySelector(selector);
      if (element) {
        resolve(element);
        return;
      }

      const root = document.body || document.documentElement;
      if (!root) {
        resolve(null);
        return;
      }

      const observer = new MutationObserver(() => {
        const found = document.querySelector(selector);
        if (found) {
          observer.disconnect();
          window.clearTimeout(timeoutId);
          resolve(found);
        }
      });

      const timeoutId = window.setTimeout(() => {
        observer.disconnect();
        resolve(null);
      }, timeout);

      observer.observe(root, { childList: true, subtree: true });
    });
  }

  function dispatchInputEvents(element: HTMLElement): void {
    element.dispatchEvent(new Event("input", { bubbles: true }));
    element.dispatchEvent(new Event("change", { bubbles: true }));
  }

  function setControlValue(element: HTMLInputElement | HTMLTextAreaElement, value: string): void {
    const prototype =
      element instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
    const valueSetter = Object.getOwnPropertyDescriptor(prototype, "value")?.set;
    if (valueSetter) {
      valueSetter.call(element, value);
    } else {
      element.value = value;
    }
    dispatchInputEvents(element);
  }

  function editorHasContent(editor: HTMLElement): boolean {
    if (editor.textContent?.trim()) return true;

    const html = editor.innerHTML.trim();
    if (!html) return false;

    const parser = new DOMParser();
    const doc = parser.parseFromString(html, "text/html");
    if (doc.body.textContent?.trim()) return true;

    return Boolean(doc.body.querySelector("img,video,iframe,embed,object,table"));
  }

  function pasteHtml(editor: HTMLElement, html: string): boolean {
    editor.focus();
    try {
      const pasteEvent = new ClipboardEvent("paste", {
        bubbles: true,
        cancelable: true,
        clipboardData: new DataTransfer(),
      });
      pasteEvent.clipboardData?.setData("text/html", html);
      editor.dispatchEvent(pasteEvent);
    } catch (error) {
      console.debug("Gelonghui synthetic paste failed; using direct HTML write", error);
    }

    // Some editors ignore synthetic paste events, so write directly and then notify the framework.
    editor.innerHTML = html;
    dispatchInputEvents(editor);
    return editorHasContent(editor);
  }

  async function createFile(fileData: FileData, label: string): Promise<File | null> {
    if (!fileData.url) return null;

    try {
      const response = await fetch(fileData.url);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const blob = await response.blob();
      return new File([blob], fileData.name, { type: fileData.type || blob.type || "application/octet-stream" });
    } catch (error) {
      console.warn(`Gelonghui ${label} file fetch failed:`, error);
      return null;
    }
  }

  async function uploadInlineImage(fileData: FileData): Promise<string | null> {
    const file = await createFile(fileData, "inline image");
    if (!file) return null;

    const formData = new FormData();
    formData.append("file", file);
    formData.append("original_filename", fileData.name);

    try {
      const response = await fetch("https://www.gelonghui.com/api/file/post/image", {
        method: "POST",
        body: formData,
        headers: {
          "x-file-name": fileData.name,
          "x-requested-with": "XMLHttpRequest",
        },
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const result = (await response.json()) as ImageUploadResult;
      return result?.result || null;
    } catch (error) {
      console.warn("Gelonghui inline image upload failed; keeping original inline image URL", error);
      return null;
    }
  }

  function isLocalHostname(hostname: string): boolean {
    const normalizedHostname = hostname.toLowerCase().replace(/^\[|\]$/g, "");
    if (normalizedHostname === "localhost" || normalizedHostname.endsWith(".localhost")) return true;

    const octets = normalizedHostname.split(".").map((part) => Number(part));
    if (octets.length === 4 && octets.every((octet) => Number.isInteger(octet) && octet >= 0 && octet <= 255)) {
      const [first, second] = octets;
      return (
        first === 0 ||
        first === 10 ||
        first === 127 ||
        (first === 169 && second === 254) ||
        (first === 172 && second >= 16 && second <= 31) ||
        (first === 192 && second === 168)
      );
    }

    if (!normalizedHostname.includes(":")) return false;
    return (
      normalizedHostname === "::1" ||
      normalizedHostname.startsWith("fc") ||
      normalizedHostname.startsWith("fd") ||
      normalizedHostname.startsWith("fe80:")
    );
  }

  function isPublicHttpUrl(src: string): boolean {
    const trimmedSrc = src.trim();
    if (!trimmedSrc) return false;

    try {
      const url = new URL(trimmedSrc);
      return (url.protocol === "http:" || url.protocol === "https:") && !isLocalHostname(url.hostname);
    } catch {
      return false;
    }
  }

  async function rewriteInlineImages(htmlContent: string, images: FileData[]): Promise<InlineImageRewriteResult> {
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlContent, "text/html");
    const imageElements = Array.from(doc.getElementsByTagName("img"));
    let isFullyPrepared = true;

    for (const imageElement of imageElements) {
      const src = imageElement.getAttribute("src")?.trim() || "";
      if (!src) {
        console.debug("Gelonghui inline image src is empty");
        isFullyPrepared = false;
        continue;
      }

      if (isPublicHttpUrl(src)) continue;

      const imageData = images.find((image) => image.url === src);
      if (!imageData) {
        console.debug("Gelonghui inline image data not found; unable to rewrite non-public image URL");
        isFullyPrepared = false;
        continue;
      }

      const newSrc = await uploadInlineImage(imageData);
      if (newSrc) {
        imageElement.setAttribute("src", newSrc);
      }

      const rewrittenSrc = imageElement.getAttribute("src")?.trim() || "";
      if (!isPublicHttpUrl(rewrittenSrc)) {
        isFullyPrepared = false;
      }
    }

    return {
      htmlContent: doc.body.innerHTML,
      isFullyPrepared,
    };
  }

  async function uploadCover(cover?: FileData): Promise<boolean> {
    if (!cover) return true;
    if (!cover.url) {
      console.debug("Gelonghui cover data has no URL");
      return false;
    }

    const fileInput = (document.querySelector("input#cover-file") ||
      (await waitForElementOptional("input#cover-file", 3000))) as HTMLInputElement | null;
    if (!fileInput) {
      console.debug("Gelonghui cover upload input not found");
      return false;
    }

    const file = await createFile(cover, "cover");
    if (!file) return false;

    const dataTransfer = new DataTransfer();
    dataTransfer.items.add(file);
    if (dataTransfer.files.length === 0) return false;

    fileInput.files = dataTransfer.files;
    dispatchInputEvents(fileInput);
    await sleep(3000);
    return true;
  }

  function canAutoPublish(required: RequiredFields): boolean {
    let canPublish = true;
    if (!required.title) {
      console.error("Gelonghui required field title not filled; skipping auto-publish");
      canPublish = false;
    }
    if (!required.body) {
      console.error("Gelonghui required field body not filled; skipping auto-publish");
      canPublish = false;
    } else if (!required.bodyFullyPrepared) {
      console.error("Gelonghui inline image upload failed; skipping auto-publish to avoid broken images");
      canPublish = false;
    }
    if (!required.cover) {
      console.error("Gelonghui required field cover not filled; skipping auto-publish");
      canPublish = false;
    }
    return canPublish;
  }

  function clickPublishIfRequested(required: RequiredFields): void {
    if (data.isAutoPublish !== true) return;
    if (!canAutoPublish(required)) return;

    const publishButton = document.querySelector(
      "div.button_publish.item.editor-btn.editor-main-btn",
    ) as HTMLElement | null;
    if (!publishButton) {
      console.debug("Gelonghui publish button not found");
      return;
    }

    publishButton.dispatchEvent(new Event("click", { bubbles: true }));
  }

  try {
    const required: RequiredFields = {
      title: false,
      body: false,
      bodyFullyPrepared: true,
      cover: !articleData.cover,
    };

    await waitForElementOptional("input.doc-title");
    await sleep(1000);

    const titleInput = document.querySelector("input.doc-title") as HTMLInputElement | null;
    const title = articleData.title?.slice(0, 64) || "";
    if (titleInput && title) {
      try {
        setControlValue(titleInput, title);
        required.title = true;
      } catch (error) {
        console.error("Gelonghui title write failed:", error);
      }
    } else {
      console.debug("Gelonghui title input not found or title is empty");
    }

    const summaryTextarea = document.querySelector("textarea#doc-summary") as HTMLTextAreaElement | null;
    if (summaryTextarea) {
      setControlValue(summaryTextarea, articleData.digest?.slice(0, 150) || "");
    } else {
      console.debug("Gelonghui summary textarea not found");
    }

    const editor = document.querySelector('div.simditor-body[contenteditable="true"]') as HTMLElement | null;
    const rewriteResult = await rewriteInlineImages(articleData.htmlContent || "", articleData.images || []);
    const htmlContent = rewriteResult.htmlContent;
    if (editor && htmlContent) {
      try {
        required.body = pasteHtml(editor, htmlContent);
        if (required.body) {
          required.bodyFullyPrepared = rewriteResult.isFullyPrepared;
        } else {
          console.error("Gelonghui body editor remained empty after write; skipping auto-publish");
        }
      } catch (error) {
        console.error("Gelonghui body write failed:", error);
      }
    } else {
      console.debug("Gelonghui body editor not found or content is empty");
    }

    try {
      required.cover = await uploadCover(articleData.cover);
    } catch (error) {
      console.error("Gelonghui cover upload failed:", error);
      required.cover = false;
    }
    clickPublishIfRequested(required);
  } catch (error) {
    console.error("Gelonghui article publish failed:", error);
  }
}
