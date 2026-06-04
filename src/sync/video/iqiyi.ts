import type { FileData, SyncData, VideoData } from "../common";

export async function VideoIqiyi(data: SyncData) {
  function waitForElement(selector: string, timeout = 60000): Promise<Element> {
    return new Promise((resolve, reject) => {
      const exist = document.querySelector(selector);
      if (exist) {
        resolve(exist);
        return;
      }
      let timer = 0;
      const observer = new MutationObserver(() => {
        const found = document.querySelector(selector);
        if (found) {
          window.clearTimeout(timer);
          observer.disconnect();
          resolve(found);
        }
      });
      observer.observe(document.body || document.documentElement, { childList: true, subtree: true });
      timer = window.setTimeout(() => {
        observer.disconnect();
        reject(new Error(`Element with selector "${selector}" not found within ${timeout}ms`));
      }, timeout);
    });
  }

  const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

  function isVisible(element: Element): boolean {
    const style = window.getComputedStyle(element);
    return style.display !== "none" && style.visibility !== "hidden" && element.getClientRects().length > 0;
  }

  function findVisibleElement<T extends Element>(selector: string, root: ParentNode = document): T | null {
    return (Array.from(root.querySelectorAll(selector)) as T[]).find(isVisible) ?? null;
  }

  async function injectCoverFile(input: HTMLInputElement, file: FileData): Promise<boolean> {
    if (file.type && !file.type.startsWith("image/")) return false;

    const cBuf = await (await fetch(file.url)).arrayBuffer();
    const coverFile = new File([cBuf], file.name, { type: file.type || "image/png" });
    const cdt = new DataTransfer();
    cdt.items.add(coverFile);
    input.files = cdt.files;
    input.dispatchEvent(new Event("change", { bubbles: true }));
    input.dispatchEvent(new Event("input", { bubbles: true }));
    return true;
  }

  async function uploadVerticalCoverImage(file: FileData): Promise<void> {
    const coverEntry = document.querySelector("div.set-cover") as HTMLElement | null;
    if (!coverEntry) return;
    coverEntry.click();
    await sleep(1000);

    const coverPanel = findVisibleElement<HTMLElement>("div.base-cover-new");
    const coverInput = coverPanel?.querySelector(
      "div.cover-editor-wrap input[type='file'][accept='.jpg,.jpeg,.png']",
    ) as HTMLInputElement | null;
    if (!coverInput) return;

    if (!(await injectCoverFile(coverInput, file))) return;
    await sleep(3000);

    const confirmBtn = coverPanel?.querySelector("div.mp-popup-btn.editor-modal-bottom button") as HTMLElement | null;
    confirmBtn?.click();
  }

  async function uploadHorizontalCoverImage(file: FileData): Promise<void> {
    let cropPanel = findVisibleElement<HTMLElement>("div.image-crop-content");
    const cropEntry = cropPanel?.querySelector("div.no-data-wrap div.main-edit-bar") as HTMLElement | null;
    if (!cropEntry) return;
    cropEntry.click();
    await sleep(2000);

    cropPanel = findVisibleElement<HTMLElement>("div.image-crop-content") ?? cropPanel;
    const panelRoot = cropPanel?.closest("div.base-cover-new") ?? cropPanel;
    const coverInput = cropPanel?.querySelector(
      "input[type='file'][accept='.jpg,.jpeg,.png']",
    ) as HTMLInputElement | null;
    if (!coverInput) return;

    if (!(await injectCoverFile(coverInput, file))) return;
    await sleep(3000);

    const doneBtn = Array.from(panelRoot?.querySelectorAll("button") ?? []).find(
      (button) => button.textContent?.trim() === "完成",
    );
    if (doneBtn && !doneBtn.disabled) {
      doneBtn.click();
      await sleep(1000);
    }
  }

  async function publishIfAutoEnabled(): Promise<void> {
    if (data.isAutoPublish !== true) return;

    // Re-query while polling so rerenders do not leave us holding a stale button.
    const findPublishButton = () =>
      Array.from(document.querySelectorAll("button")).find((button) => button.textContent?.includes("发布"));

    let publishButton = findPublishButton();
    for (let i = 0; i < 60; i++) {
      publishButton = findPublishButton();
      if (publishButton && publishButton.getAttribute("aria-disabled") !== "true") break;
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    if (!publishButton) {
      console.debug('未找到"发布"按钮');
      return;
    }
    if (publishButton.getAttribute("aria-disabled") === "true") {
      console.debug("发布按钮仍不可用，跳过自动发布");
      return;
    }

    console.debug("sendButton clicked");
    publishButton.dispatchEvent(new Event("click", { bubbles: true }));
  }

  try {
    const { title, content, video, tags, cover, horizontalCover, description, original } = data.data as VideoData;
    if (!video) {
      console.error("爱奇艺：未提供视频文件");
      return;
    }

    // Upload video.
    const fileInput = (await waitForElement('input[type="file"]')) as HTMLInputElement;
    const buf = await (await fetch(video.url)).arrayBuffer();
    const ext = video.name.split(".").pop() || "mp4";
    const videoFile = new File([buf], `${title}.${ext}`, { type: video.type || "video/mp4" });
    const dt = new DataTransfer();
    dt.items.add(videoFile);
    fileInput.files = dt.files;
    fileInput.dispatchEvent(new Event("change", { bubbles: true }));

    await new Promise((resolve) => setTimeout(resolve, 3000));

    // Fill title. iQiyi caps titles at 30 characters.
    const titleInput = document.querySelector(
      'input[type="text"][maxlength], input[placeholder*="标题"]',
    ) as HTMLInputElement | null;
    if (titleInput && title) {
      titleInput.focus();
      titleInput.value = title.slice(0, 30);
      titleInput.dispatchEvent(new Event("input", { bubbles: true }));
      titleInput.dispatchEvent(new Event("change", { bubbles: true }));
    }

    // Fill description.
    const descTextarea = document.querySelector('textarea[placeholder="输入视频简介"]') as HTMLTextAreaElement | null;
    if (descTextarea) {
      descTextarea.focus();
      descTextarea.value = description || content || "";
      descTextarea.dispatchEvent(new Event("input", { bubbles: true }));
      descTextarea.dispatchEvent(new Event("change", { bubbles: true }));
    }

    // Fill tags.
    if (tags?.length) {
      const tagInput = document.querySelector(
        'input[type="text"][autocomplete="off"][class*="mp-input__tag-inner"]',
      ) as HTMLInputElement | null;
      if (tagInput) {
        for (const tag of tags.slice(0, 10)) {
          tagInput.focus();
          tagInput.value = tag;
          tagInput.dispatchEvent(new Event("input", { bubbles: true }));
          tagInput.dispatchEvent(
            new KeyboardEvent("keydown", { bubbles: true, key: "Enter", code: "Enter", keyCode: 13 }),
          );
          await new Promise((resolve) => setTimeout(resolve, 400));
        }
      }
    }

    // Original declaration defaults to original; explicit false switches to non-original.
    if (original === false) {
      const nonOriginalRadio = (document.querySelector('input[type="radio"][value="1"][class*="el-radio__original"]') ||
        document.querySelectorAll('input[type="radio"][class*="mp-radio__original"]')[1]) as
        | HTMLInputElement
        | null
        | undefined;
      nonOriginalRadio?.click();
    } else {
      const originalRadio = (document.querySelector('input[type="radio"][value="0"][class*="el-radio__original"]') ||
        document.querySelector('input[type="radio"][value="0"][class*="mp-radio__original"]') ||
        document.querySelectorAll('input[type="radio"][class*="mp-radio__original"]')[0]) as
        | HTMLInputElement
        | null
        | undefined;
      originalRadio?.click();
    }

    // Upload vertical and horizontal covers.
    if (cover) {
      await uploadVerticalCoverImage(cover);
      await sleep(5000);
    }
    if (horizontalCover) {
      await uploadHorizontalCoverImage(horizontalCover);
    }

    await publishIfAutoEnabled();
  } catch (error) {
    console.error("爱奇艺视频发布失败:", error);
  }
}
