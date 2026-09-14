import type { DynamicData, SyncData } from "../types";

/** Fill the image-text publisher on tv.sohu.com. */
export async function DynamicSohuTv(data: SyncData): Promise<void> {
  if (!("videos" in data.data)) return;

  const dynamicData: DynamicData = data.data;
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

  async function fileFromUrl(file: { url: string; name: string; type?: string }): Promise<File | null> {
    const response = await fetch(file.url);
    if (!response.ok) {
      console.error(`搜狐视频图片读取失败：HTTP ${response.status}`);
      return null;
    }
    const blob = await response.blob();
    return new File([blob], file.name, { type: file.type || blob.type || "image/jpeg" });
  }

  try {
    const tab = Array.from(document.querySelectorAll("span.title")).find((element) =>
      element.textContent?.includes("上传图文"),
    );
    if (!(tab instanceof HTMLElement)) return;
    tab.click();

    const inputElement = await waitForElement('input[type="file"]');
    if (!(inputElement instanceof HTMLInputElement)) return;
    const transfer = new DataTransfer();
    for (const image of dynamicData.images) {
      const file = await fileFromUrl(image);
      if (file) transfer.items.add(file);
    }
    if (transfer.files.length === 0) return;
    inputElement.files = transfer.files;
    inputElement.dispatchEvent(new Event("change", { bubbles: true }));
    inputElement.dispatchEvent(new Event("input", { bubbles: true }));
    await sleep(5000);

    const title = await waitForElement('input[type="text"]');
    if (title instanceof HTMLInputElement) {
      title.value = dynamicData.title || dynamicData.content.slice(0, 20);
      title.dispatchEvent(new Event("input", { bubbles: true }));
    }

    const editor = await waitForElement('div[contenteditable="true"]');
    if (editor instanceof HTMLElement) {
      editor.innerText = dynamicData.content;
      editor.dispatchEvent(new Event("input", { bubbles: true }));
    }

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
    console.error("搜狐视频图文发布按钮在等待后仍不可用");
  } catch (error) {
    console.error("搜狐视频图文发布失败:", error);
  }
}
