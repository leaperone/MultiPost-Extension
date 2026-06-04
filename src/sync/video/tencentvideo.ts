import type { FileData, SyncData, VideoData } from "../common";

export async function VideoTencentVideo(data: SyncData) {
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

  function getVisibleCoverUploadRoots(): HTMLElement[] {
    const roots = Array.from(
      document.querySelectorAll(
        '[role="dialog"], div[class*="modal"], div[class*="Modal"], div[class*="dialog"], div[class*="Dialog"], div[class*="popup"], div[class*="Popup"]',
      ),
    ) as HTMLElement[];
    return roots.filter(
      (root) => isVisible(root) && Boolean(root.querySelector('input#uploadCoverBtn, button[dt-mpid="上传封面确定"]')),
    );
  }

  function getEntryCoverRoot(entry: HTMLElement): HTMLElement | null {
    return entry.closest(
      'div[class*="cover"], div[class*="Cover"], div[class*="upload"], div[class*="Upload"]',
    ) as HTMLElement | null;
  }

  function uniqueRoots(roots: Array<HTMLElement | null>): HTMLElement[] {
    return roots.filter((root, index): root is HTMLElement => Boolean(root) && roots.indexOf(root) === index);
  }

  async function waitForCoverInput(
    entry: HTMLElement,
    existingRoots: Set<HTMLElement>,
    timeout = 3000,
  ): Promise<{ input: HTMLInputElement; root: HTMLElement } | null> {
    const deadline = Date.now() + timeout;
    while (Date.now() < deadline) {
      const roots = uniqueRoots([
        ...getVisibleCoverUploadRoots().filter((root) => !existingRoots.has(root)),
        getEntryCoverRoot(entry),
      ]);
      for (const root of roots) {
        const input = root.querySelector("input#uploadCoverBtn") as HTMLInputElement | null;
        if (input) return { input, root };
      }
      await sleep(150);
    }
    return null;
  }

  async function waitForCoverConfirmButton(root: HTMLElement, timeout = 5000): Promise<HTMLElement | null> {
    const deadline = Date.now() + timeout;
    while (Date.now() < deadline) {
      const confirmBtn = root.querySelector('button[dt-mpid="上传封面确定"]') as HTMLElement | null;
      if (confirmBtn) return confirmBtn;

      const dialogConfirmBtn = getVisibleCoverUploadRoots()
        .find((dialogRoot) => dialogRoot !== root)
        ?.querySelector('button[dt-mpid="上传封面确定"]') as HTMLElement | null | undefined;
      if (dialogConfirmBtn) return dialogConfirmBtn;

      await sleep(200);
    }
    return null;
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

  async function uploadCoverImage(file: FileData, entrySelector: string): Promise<void> {
    const manualEntry = document.querySelector(entrySelector) as HTMLElement | null;
    if (!manualEntry) return;

    const existingRoots = new Set(getVisibleCoverUploadRoots());
    manualEntry.click();
    const coverInputResult = await waitForCoverInput(manualEntry, existingRoots);
    if (!coverInputResult) return;

    if (!(await injectCoverFile(coverInputResult.input, file))) return;
    await sleep(1500);

    const confirmBtn = await waitForCoverConfirmButton(coverInputResult.root);
    confirmBtn?.click();
    if (confirmBtn) await sleep(1000);
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
    const { title, content, video, cover, horizontalCover, description } = data.data as VideoData;
    if (!video) {
      console.error("腾讯视频：未提供视频文件");
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

    // Fill title.
    const titleInput = document.querySelector(
      'input[placeholder*="标题"], input[type="text"]',
    ) as HTMLInputElement | null;
    if (titleInput && title) {
      titleInput.focus();
      titleInput.value = title;
      titleInput.dispatchEvent(new Event("input", { bubbles: true }));
      titleInput.dispatchEvent(new Event("change", { bubbles: true }));
    }

    // Fill description.
    const descArea = document.querySelector('textarea[placeholder*="简介"]') as HTMLTextAreaElement | null;
    if (descArea) {
      descArea.focus();
      descArea.value = description || content || "";
      descArea.dispatchEvent(new Event("input", { bubbles: true }));
      descArea.dispatchEvent(new Event("change", { bubbles: true }));
    }

    // Upload vertical and horizontal covers from their separate entry points.
    if (cover) {
      await uploadCoverImage(cover, 'div[class*="manualUploadCoverButton_"]');
      await sleep(2000);
    }
    if (horizontalCover) {
      await uploadCoverImage(horizontalCover, 'div[class*="uploadAddArea___"]');
    }

    await publishIfAutoEnabled();
  } catch (error) {
    console.error("腾讯视频发布失败:", error);
  }
}
