import type { SyncData, VideoData } from "../types";

/**
 * Fill the separate tv.sohu.com creator page.
 *
 * The tv.sohu.com page is a different publisher from mp.sohu.com. It accepts
 * both short video and image-text inputs from the same page, but MultiPost's
 * video target intentionally handles only the video path here.
 */
export async function VideoSohuTv(data: SyncData): Promise<void> {
  if (!("video" in data.data)) return;

  const videoData: VideoData = data.data;
  const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

  async function waitForElement(selector: string, timeout = 15000): Promise<Element | null> {
    const deadline = Date.now() + timeout;
    while (Date.now() < deadline) {
      const element = document.querySelector(selector);
      if (element) return element;
      await sleep(250);
    }
    return null;
  }

  function setTextInput(element: Element, value: string): boolean {
    if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
      element.value = value;
      element.dispatchEvent(new Event("input", { bubbles: true }));
      element.dispatchEvent(new Event("change", { bubbles: true }));
      return true;
    }
    if (element instanceof HTMLElement && element.isContentEditable) {
      element.innerText = value;
      element.dispatchEvent(new Event("input", { bubbles: true }));
      return true;
    }
    return false;
  }

  async function fileFromUrl(file: { url: string; name: string; type?: string }): Promise<File | null> {
    const response = await fetch(file.url);
    if (!response.ok) {
      console.error(`搜狐视频素材读取失败：HTTP ${response.status}`);
      return null;
    }
    const blob = await response.blob();
    return new File([blob], file.name, { type: file.type || blob.type || "application/octet-stream" });
  }

  async function dispatchFile(input: HTMLInputElement, file: File): Promise<boolean> {
    const transfer = new DataTransfer();
    transfer.items.add(file);
    if (transfer.files.length === 0) return false;
    input.files = transfer.files;
    input.dispatchEvent(new Event("change", { bubbles: true }));
    input.dispatchEvent(new Event("input", { bubbles: true }));
    return true;
  }

  async function uploadVideo(): Promise<boolean> {
    if (!videoData.video) return false;
    const element = await waitForElement('input[type="file"]');
    if (!(element instanceof HTMLInputElement)) return false;
    const file = await fileFromUrl(videoData.video);
    return file ? dispatchFile(element, file) : false;
  }

  async function uploadCover(): Promise<void> {
    const cover = videoData.horizontalCover || videoData.cover;
    if (!cover) return;
    const trigger = await waitForElement("p.pic-edit", 5000);
    if (!(trigger instanceof HTMLElement)) return;
    trigger.click();
    const input = await waitForElement("input.uploadImg", 5000);
    if (!(input instanceof HTMLInputElement)) return;
    const file = await fileFromUrl(cover);
    if (!file || !file.type.startsWith("image/")) return;
    if (await dispatchFile(input, file)) {
      const confirm = Array.from(document.querySelectorAll("a.btn-main")).find(
        (element) => element.textContent?.trim() === "确认",
      );
      if (confirm instanceof HTMLElement) confirm.click();
    }
  }

  try {
    if (!(await uploadVideo())) return;
    await sleep(1000);

    const title = await waitForElement('input[type="text"]');
    if (title) setTextInput(title, videoData.title || videoData.content.slice(0, 20));

    const description = await waitForElement('textarea, div[contenteditable="true"]');
    if (description) setTextInput(description, videoData.description || videoData.content);

    const topic = document.querySelector("input.input-topic");
    if (topic instanceof HTMLInputElement) {
      for (const tag of videoData.tags?.slice(0, 2) || []) {
        topic.value = tag;
        topic.dispatchEvent(new Event("input", { bubbles: true }));
        topic.dispatchEvent(
          new KeyboardEvent("keydown", {
            bubbles: true,
            cancelable: true,
            key: "Enter",
            code: "Enter",
            keyCode: 13,
            which: 13,
          }),
        );
        await sleep(500);
      }
    }

    await uploadCover();
    if (!data.isAutoPublish) return;

    const publishButton = Array.from(document.querySelectorAll("button")).find((element) =>
      element.textContent?.includes("发布"),
    );
    if (!(publishButton instanceof HTMLButtonElement)) return;

    for (let attempt = 0; attempt < 120; attempt += 1) {
      if (publishButton.getAttribute("aria-disabled") !== "true" && !publishButton.disabled) {
        publishButton.click();
        return;
      }
      await sleep(1000);
    }
    console.error("搜狐视频发布按钮在等待后仍不可用");
  } catch (error) {
    console.error("搜狐视频发布失败:", error);
  }
}
