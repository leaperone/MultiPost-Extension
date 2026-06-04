import type { ArticleData, FileData, SyncData } from "../common";

export async function ArticleSMZDM(data: SyncData) {
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
      console.warn("SMZDM cover file fetch failed:", error);
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

  function findElementByText(selector: string, text: string): HTMLElement | null {
    return (
      (Array.from(document.querySelectorAll<HTMLElement>(selector)).find((element) =>
        element.textContent?.includes(text),
      ) as HTMLElement | undefined) || null
    );
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
      console.debug("SMZDM cover data has no URL");
      return false;
    }

    const uploadButton = document.querySelector("div.img-upload-btn") as HTMLElement | null;
    const changeLongImageButton = findElementByText("div.thumb-cover > div, button, span", "更换长图");
    const coverEntry = uploadButton || changeLongImageButton;
    if (!coverEntry) {
      console.debug("SMZDM cover upload entry not found");
      return false;
    }

    coverEntry.click();
    await sleep(1000);

    const fileInput = (document.querySelector('input[name="file"]') ||
      (await waitForElementOptional('input[name="file"]', 3000))) as HTMLInputElement | null;
    if (!fileInput) {
      console.debug("SMZDM cover file input not found");
      return false;
    }

    const uploaded = await setFileInput(fileInput, cover);
    if (!uploaded) return false;

    await sleep(3000);
    const uploadCoverButton = document.querySelector("div.upload-cover") as HTMLElement | null;
    if (!uploadCoverButton) {
      console.debug("SMZDM set-cover button not found");
      return false;
    }

    uploadCoverButton.click();
    await sleep(1000);

    const confirmCoverButton = findElementByText("button.cancel-btn", "确定此图");
    if (confirmCoverButton) {
      confirmCoverButton.click();
      await sleep(3000);
    } else {
      console.debug("SMZDM confirm-cover button not found");
    }

    const okButton = findElementByText("button.ok-btn", "确认");
    if (okButton) {
      okButton.click();
      await sleep(3000);
    } else {
      console.debug("SMZDM final cover confirm button not found");
    }

    return true;
  }

  // SMZDM treats images with alt text as remote links, so strip alt before upload.
  function stripImgAlt(html: string): string {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, "text/html");
    for (const img of Array.from(doc.getElementsByTagName("img"))) {
      img.removeAttribute("alt");
    }
    return doc.body.innerHTML;
  }

  function canAutoPublish(required: { title: boolean; body: boolean; cover: boolean }): boolean {
    const missing = [
      ["title", required.title],
      ["body", required.body],
      ["cover", required.cover],
    ].filter(([, filled]) => !filled);

    for (const [field] of missing) {
      console.error(`SMZDM required field ${field} not filled; skipping auto-publish to avoid an incomplete article`);
    }

    return missing.length === 0;
  }

  function clickPublishIfRequested(required: { title: boolean; body: boolean; cover: boolean }): void {
    if (data.isAutoPublish === true && !canAutoPublish(required)) {
      return;
    }

    const publishButton = findElementByText("button", " 发布 ");
    if (!publishButton) {
      console.debug("SMZDM publish button not found");
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

    await waitForElementOptional('textarea[placeholder*="标题"]');
    const titleEl = document.querySelector('textarea[placeholder*="标题"]') as HTMLTextAreaElement | null;
    if (titleEl && title) {
      try {
        titleEl.focus();
        titleEl.value = title.slice(0, 100);
        dispatchInputEvents(titleEl);
        required.title = true;
      } catch (error) {
        console.error("SMZDM title write failed:", error);
      }
    } else {
      console.debug("SMZDM title input not found");
    }

    const editor = document.querySelector('div.ProseMirror[contenteditable="true"]') as HTMLDivElement | null;
    if (editor) {
      try {
        editor.focus();
        editor.innerHTML = "";
        await sleep(600);
        editor.click();
        pasteHtml(editor, stripImgAlt(htmlContent || ""));
        required.body = true;
      } catch (error) {
        console.error("SMZDM body write failed:", error);
      }
    } else {
      console.debug("SMZDM ProseMirror editor not found");
    }

    try {
      required.cover = await uploadCover(cover);
    } catch (error) {
      console.error("SMZDM cover upload failed:", error);
      required.cover = false;
    }
    clickPublishIfRequested(required);
  } catch (error) {
    console.error("什么值得买文章发布失败:", error);
  }
}
