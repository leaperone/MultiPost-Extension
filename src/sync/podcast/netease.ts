import type { PodcastData, SyncData } from "~sync/common";

export async function PodcastNetease(data: SyncData) {
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

  try {
    const { title, description, audio } = data.data as PodcastData;

    await waitForElement('input[type="file"]');
    await new Promise((resolve) => setTimeout(resolve, 800));

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    if (!fileInput) throw new Error("未找到音频上传输入框");

    const buf = await (await fetch(audio.url)).arrayBuffer();
    const ext = audio.name.split(".").pop() || "mp3";
    const audioFile = new File([buf], `${title}.${ext}`, { type: audio.type || "audio/mpeg" });

    const dt = new DataTransfer();
    dt.items.add(audioFile);
    fileInput.files = dt.files;
    fileInput.dispatchEvent(new Event("change", { bubbles: true }));
    fileInput.dispatchEvent(new Event("input", { bubbles: true }));

    await new Promise((resolve) => setTimeout(resolve, 1500));

    await waitForElement('input[name="name"]');
    const titleInput = document.querySelector('input[name="name"]') as HTMLInputElement | null;
    if (titleInput) {
      titleInput.focus();
      titleInput.value = title;
      titleInput.dispatchEvent(new Event("input", { bubbles: true }));
      titleInput.dispatchEvent(new Event("change", { bubbles: true }));
    }

    const editor = document.querySelector('div[contenteditable="true"]') as HTMLDivElement | null;
    if (editor) {
      editor.innerHTML = description || "";
      editor.dispatchEvent(new Event("input", { bubbles: true }));
      editor.dispatchEvent(new Event("change", { bubbles: true }));
    }
  } catch (error) {
    console.error("网易云音乐播客上传失败:", error);
  }
}
