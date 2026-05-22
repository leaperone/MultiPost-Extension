import type { PodcastData, SyncData } from "~sync/common";

export async function PodcastXimalaya(data: SyncData) {
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

    // 上传音频
    await waitForElement('input[type="file"][name="file"]');
    await new Promise((resolve) => setTimeout(resolve, 800));

    const fileInput = document.querySelector('input[type="file"][name="file"]') as HTMLInputElement;
    if (!fileInput) throw new Error("未找到音频上传输入框");

    const buf = await (await fetch(audio.url)).arrayBuffer();
    const ext = audio.name.split(".").pop() || "mp3";
    const safeTitle = title.slice(0, 40).replaceAll(".", "_");
    const audioFile = new File([buf], `${safeTitle}.${ext}`, { type: audio.type || "audio/mpeg" });

    const dt = new DataTransfer();
    dt.items.add(audioFile);
    fileInput.files = dt.files;
    fileInput.dispatchEvent(new Event("change", { bubbles: true }));
    fileInput.dispatchEvent(new Event("input", { bubbles: true }));

    await new Promise((resolve) => setTimeout(resolve, 1200));

    // 标题
    const titleInput = document.querySelector(
      'input[type="text"][placeholder="请输入声音标题"]',
    ) as HTMLInputElement | null;
    if (titleInput) {
      titleInput.focus();
      titleInput.value = title;
      titleInput.dispatchEvent(new Event("input", { bubbles: true }));
      titleInput.dispatchEvent(new Event("change", { bubbles: true }));
    }

    // 喜马拉雅的简介编辑器在 iframe 内
    const editorIframe = document.querySelector("iframe.ke-edit-iframe") as HTMLIFrameElement | null;
    const editorBody = editorIframe?.contentDocument?.body;
    if (editorBody) {
      editorBody.innerHTML = description || "";
      editorBody.dispatchEvent(new Event("input", { bubbles: true }));
      editorBody.dispatchEvent(new Event("change", { bubbles: true }));
    } else {
      console.warn("未能进入喜马拉雅简介 iframe，描述未填充");
    }
  } catch (error) {
    console.error("喜马拉雅播客上传失败:", error);
  }
}
