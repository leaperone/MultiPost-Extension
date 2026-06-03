// Experimental publisher (待线上验证)
import type { PodcastData, SyncData } from "~sync/common";

export async function PodcastSpotify(data: SyncData) {
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
        reject(new Error(`元素 "${selector}" 在 ${timeout}ms 内未出现`));
      }, timeout);
    });
  }

  function sleep(timeout: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, timeout));
  }

  try {
    const { title, description, audio } = data.data as PodcastData;

    await waitForElement("input#uploadAreaInput");
    await sleep(1000);

    console.debug("try upload file", audio);
    const fileInput = document.querySelector("input#uploadAreaInput") as HTMLInputElement | null;
    console.debug("fileInput -->", fileInput);
    if (!fileInput) {
      console.debug("未找到文件输入元素");
      return;
    }

    const response = await fetch(audio.url);
    const arrayBuffer = await response.arrayBuffer();
    const ext = audio.name.split(".").pop() || "mp3";
    const uploadFile = new File([arrayBuffer], `${title}.${ext}`, { type: audio.type });
    console.debug("uploadFile", uploadFile);

    const dataTransfer = new DataTransfer();
    dataTransfer.items.add(uploadFile);
    fileInput.files = dataTransfer.files;
    fileInput.dispatchEvent(new Event("change", { bubbles: true }));
    fileInput.dispatchEvent(new Event("input", { bubbles: true }));
    console.debug("文件上传操作完成");

    await waitForElement('input[name="title"]');
    await sleep(2000);
    const titleInput = document.querySelector('input[name="title"]') as HTMLInputElement | null;
    console.debug("titleInput", titleInput);
    if (titleInput) {
      titleInput.value = title;
      titleInput.dispatchEvent(new Event("input", { bubbles: true }));
      titleInput.dispatchEvent(new Event("change", { bubbles: true }));
    }

    const editor = document.querySelector('div[contenteditable="true"]') as HTMLElement | null;
    console.debug("qlEditor", editor);
    if (!editor) {
      console.debug("未找到编辑器元素");
      return;
    }

    editor.focus();
    await sleep(1000);
    const pasteEvent = new ClipboardEvent("paste", {
      bubbles: true,
      cancelable: true,
      clipboardData: new DataTransfer(),
    });
    pasteEvent.clipboardData?.setData("text/plain", description || "");
    editor.dispatchEvent(pasteEvent);
    editor.dispatchEvent(new Event("input", { bubbles: true }));
    editor.dispatchEvent(new Event("change", { bubbles: true }));
  } catch (error) {
    console.error("Spotify 播客上传失败:", error);
  }
}
