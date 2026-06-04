/**
 * Tencent Cloud article publishing (experimental, needs live verification).
 *
 * uses signed COS upload plus the draft API. This implementation keeps the DOM fill path.
 */
import type { ArticleData, FileData, SyncData } from "~sync/common";

export async function ArticleTencentyun(data: SyncData) {
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

  async function waitForElementOptional(selector: string, timeout = 15000): Promise<Element | null> {
    return waitForElement(selector, timeout).catch(() => null);
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
    element.dispatchEvent(new Event("input", { bubbles: true }));
    element.dispatchEvent(new Event("change", { bubbles: true }));
  }

  function dispatchInputEvents(element: HTMLElement): void {
    element.dispatchEvent(new Event("input", { bubbles: true }));
    element.dispatchEvent(new Event("change", { bubbles: true }));
  }

  function findMarkdownTextarea(): HTMLTextAreaElement | null {
    const textareas = Array.from(document.querySelectorAll("textarea")) as HTMLTextAreaElement[];
    return (
      textareas.find((textarea) => textarea.classList.contains("textarea")) ||
      textareas.find((textarea) => {
        const placeholder = textarea.placeholder || "";
        return !placeholder.includes("标题") && !placeholder.includes("摘要") && textarea.clientHeight >= 80;
      }) ||
      null
    );
  }

  async function fillFallbackEditor(content: string): Promise<boolean> {
    const editor = document.querySelector(
      '.CodeMirror-code[role="presentation"], .monaco-editor textarea, [contenteditable="true"]',
    ) as HTMLElement | HTMLTextAreaElement | null;
    if (!editor) return false;

    editor.focus();
    if (editor instanceof HTMLTextAreaElement) {
      setControlValue(editor, content);
    } else {
      const pasteEvent = new ClipboardEvent("paste", {
        bubbles: true,
        cancelable: true,
        clipboardData: new DataTransfer(),
      });
      pasteEvent.clipboardData?.setData("text/plain", content);
      editor.dispatchEvent(pasteEvent);
      editor.dispatchEvent(new Event("input", { bubbles: true }));
      editor.dispatchEvent(new Event("change", { bubbles: true }));
    }
    return true;
  }

  async function createFile(fileData: FileData): Promise<File | null> {
    try {
      const response = await fetch(fileData.url);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const blob = await response.blob();
      return new File([blob], fileData.name, { type: fileData.type || blob.type || "application/octet-stream" });
    } catch (error) {
      console.warn("Tencent Cloud cover file fetch failed:", error);
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

  function hasCoverText(value: string): boolean {
    return /cover|poster|thumbnail|pic|封面|配图/i.test(value);
  }

  function isImageFileInput(fileInput: HTMLInputElement): boolean {
    const accept = fileInput.accept.toLowerCase();
    return !accept || accept.includes("image");
  }

  function isCoverFileInput(fileInput: HTMLInputElement): boolean {
    if (!isImageFileInput(fileInput)) return false;

    const ownText = [
      fileInput.id,
      fileInput.name,
      fileInput.className,
      fileInput.getAttribute("aria-label") || "",
      fileInput.getAttribute("title") || "",
      fileInput.getAttribute("placeholder") || "",
    ].join(" ");
    if (hasCoverText(ownText)) return true;

    let container: HTMLElement | null = fileInput.closest("label, div, section, form");
    for (let depth = 0; container && depth < 4; depth++) {
      if (hasCoverText(container.textContent || "")) return true;
      container = container.parentElement;
    }

    return false;
  }

  function findCoverFileInput(): HTMLInputElement | null {
    const fileInputs = Array.from(document.querySelectorAll<HTMLInputElement>('input[type="file"]'));
    return fileInputs.find(isCoverFileInput) || null;
  }

  async function waitForCoverFileInputOptional(timeout = 3000): Promise<HTMLInputElement | null> {
    const deadline = Date.now() + timeout;
    while (Date.now() < deadline) {
      const fileInput = findCoverFileInput();
      if (fileInput) return fileInput;
      await sleep(250);
    }
    return null;
  }

  async function uploadCover(cover?: FileData): Promise<boolean> {
    if (!cover) return true;
    if (!cover.url) {
      console.debug("Tencent Cloud cover data has no URL");
      return false;
    }

    const fileInput = await waitForCoverFileInputOptional();
    if (!fileInput) {
      console.debug("Tencent Cloud cover upload input not found; skipping DOM cover upload");
      return false;
    }

    const uploaded = await setFileInput(fileInput, cover);
    if (uploaded) {
      await sleep(3000);
      return true;
    }
    return false;
  }

  async function clickPublishButton(): Promise<void> {
    await sleep(1000);
    const buttons = Array.from(document.querySelectorAll("button, [role='button']")) as HTMLElement[];
    const publishButton = buttons.find((element) => {
      const text = element.textContent?.trim();
      return text === "发布" || text === "发布文章" || text?.includes("发布文章");
    });
    if (publishButton) {
      publishButton.dispatchEvent(new Event("click", { bubbles: true }));
    } else {
      console.debug("腾讯云:未找到发布按钮");
    }
  }

  function canAutoPublish(required: { title: boolean; body: boolean }): boolean {
    const missing = [
      ["title", required.title],
      ["body", required.body],
    ].filter(([, filled]) => !filled);

    for (const [field] of missing) {
      console.error(`Tencent Cloud required field ${field} not filled; skipping auto-publish`);
    }

    return missing.length === 0;
  }

  try {
    await waitForElementOptional('input[placeholder*="标题"], textarea[placeholder*="标题"], textarea');
    await sleep(1000);

    const required = {
      title: false,
      body: false,
    };

    const titleInput = document.querySelector('input[placeholder*="标题"], textarea[placeholder*="标题"]') as
      | HTMLInputElement
      | HTMLTextAreaElement
      | null;
    if (titleInput) {
      setControlValue(titleInput, articleData.title || "");
      required.title = !!articleData.title;
    } else {
      console.debug("腾讯云:未找到标题输入框");
    }

    const summaryInput = document.querySelector('textarea[placeholder*="摘要"], input[placeholder*="摘要"]') as
      | HTMLInputElement
      | HTMLTextAreaElement
      | null;
    if (summaryInput) {
      setControlValue(summaryInput, articleData.digest || "");
    }

    const content = articleData.markdownContent || articleData.htmlContent || "";
    const markdownTextarea = findMarkdownTextarea();
    if (markdownTextarea) {
      markdownTextarea.focus();
      setControlValue(markdownTextarea, content);
      required.body = !!content;
    } else {
      const filledFallback = await fillFallbackEditor(content);
      if (!filledFallback) {
        console.debug("腾讯云:未找到 Markdown 编辑器");
        return;
      }
      required.body = !!content;
    }

    await uploadCover(articleData.cover);

    if (data.isAutoPublish === true && canAutoPublish(required)) {
      await clickPublishButton();
    }
  } catch (error) {
    console.error("腾讯云文章发布出错:", error);
  }
}
