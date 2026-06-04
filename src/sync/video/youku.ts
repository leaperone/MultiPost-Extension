import type { FileData, SyncData, VideoData } from "../common";

export async function VideoYouku(data: SyncData) {
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

  function findCropDialogRoot(cropIcon: HTMLElement): HTMLElement {
    const dialogRoot = cropIcon.closest(
      '[role="dialog"], div[class*="modal"], div[class*="Modal"], div[class*="dialog"], div[class*="Dialog"], div[class*="drawer"], div[class*="Drawer"]',
    ) as HTMLElement | null;
    if (dialogRoot) return dialogRoot;

    let root = cropIcon.parentElement;
    while (root && root !== document.body) {
      if (root.querySelector("button")) return root;
      root = root.parentElement;
    }

    return cropIcon.parentElement ?? document.body;
  }

  async function waitForCropDialog(
    existingCropIcons: Set<Element>,
    timeout = 5000,
  ): Promise<{
    cropIcon: HTMLElement;
    root: HTMLElement;
  } | null> {
    const deadline = Date.now() + timeout;
    while (Date.now() < deadline) {
      const cropIcons = Array.from(document.querySelectorAll("img.bi-cropper-cropBtnIcon")) as HTMLElement[];
      const cropIcon = cropIcons.find((icon) => !existingCropIcons.has(icon) && isVisible(findCropDialogRoot(icon)));
      if (cropIcon) {
        return {
          cropIcon,
          root: findCropDialogRoot(cropIcon),
        };
      }
      await sleep(200);
    }
    return null;
  }

  function findButtonByText(root: ParentNode, text: string): HTMLButtonElement | undefined {
    return Array.from(root.querySelectorAll("button")).find((button) => button.textContent?.trim() === text);
  }

  async function waitForButtonByText(
    root: ParentNode,
    text: string,
    timeout = 3000,
  ): Promise<HTMLButtonElement | null> {
    const deadline = Date.now() + timeout;
    while (Date.now() < deadline) {
      const button = findButtonByText(root, text);
      if (button) return button;
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

  async function uploadCoverImage(file: FileData, index: number): Promise<void> {
    const coverInputs = document.querySelectorAll(
      "input[type='file'][id*='-imgUpload']",
    ) as NodeListOf<HTMLInputElement>;
    const coverInput = coverInputs[index];
    if (!coverInput) return;

    const existingCropIcons = new Set(document.querySelectorAll("img.bi-cropper-cropBtnIcon"));
    if (!(await injectCoverFile(coverInput, file))) return;
    await sleep(3000);

    const cropDialog = await waitForCropDialog(existingCropIcons);
    if (!cropDialog) return;

    (cropDialog.cropIcon.parentElement ?? cropDialog.cropIcon).click();
    await sleep(1000);

    const doneBtn = await waitForButtonByText(cropDialog.root, "确 定");
    doneBtn?.click();
    if (doneBtn) await sleep(1000);

    const confirmBtn = await waitForButtonByText(cropDialog.root, "确 认");
    confirmBtn?.click();
    if (confirmBtn) await sleep(3000);
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
    const { title, content, video, tags, cover, horizontalCover, description } = data.data as VideoData;
    if (!video) {
      console.error("优酷：未提供视频文件");
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
    const titleInput = document.querySelector("input#title") as HTMLInputElement | null;
    if (titleInput && title) {
      titleInput.focus();
      titleInput.value = title;
      titleInput.dispatchEvent(new Event("input", { bubbles: true }));
      titleInput.dispatchEvent(new Event("change", { bubbles: true }));
    }

    // Fill description.
    const descTextarea = document.querySelector('textarea[placeholder="请输入视频简介"]') as HTMLTextAreaElement | null;
    if (descTextarea) {
      descTextarea.focus();
      descTextarea.value = description || content || "";
      descTextarea.dispatchEvent(new Event("input", { bubbles: true }));
      descTextarea.dispatchEvent(new Event("change", { bubbles: true }));
    }

    // Fill tags.
    if (tags?.length) {
      const tagInput = (document.querySelector(
        'input[placeholder="精准标签可获得高点击率，建议8-10个，按Enter键创建"]',
      ) || document.querySelector('input[placeholder*="标签"]')) as HTMLInputElement | null;
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

    // Upload vertical and horizontal covers. Youku uses imgUpload[0] and imgUpload[1].
    if (cover) {
      await uploadCoverImage(cover, 0);
    }
    if (horizontalCover) {
      await uploadCoverImage(horizontalCover, 1);
    }

    await publishIfAutoEnabled();
  } catch (error) {
    console.error("优酷视频发布失败:", error);
  }
}
