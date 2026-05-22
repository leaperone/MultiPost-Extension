import type { SyncData, VideoData } from "../common";

export async function VideoTencentVideo(data: SyncData) {
  function waitForElement(selector: string, timeout = 60000): Promise<Element> {
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
    const { title, content, video, cover, description } = data.data as VideoData;
    if (!video) {
      console.error("腾讯视频：未提供视频文件");
      return;
    }

    // 上传视频
    const fileInput = (await waitForElement('input[type="file"]')) as HTMLInputElement;
    const buf = await (await fetch(video.url)).arrayBuffer();
    const ext = video.name.split(".").pop() || "mp4";
    const videoFile = new File([buf], `${title}.${ext}`, { type: video.type || "video/mp4" });
    const dt = new DataTransfer();
    dt.items.add(videoFile);
    fileInput.files = dt.files;
    fileInput.dispatchEvent(new Event("change", { bubbles: true }));

    await new Promise((resolve) => setTimeout(resolve, 3000));

    // 标题
    const titleInput = document.querySelector(
      'input[placeholder*="标题"], input[type="text"]',
    ) as HTMLInputElement | null;
    if (titleInput && title) {
      titleInput.focus();
      titleInput.value = title;
      titleInput.dispatchEvent(new Event("input", { bubbles: true }));
      titleInput.dispatchEvent(new Event("change", { bubbles: true }));
    }

    // 简介
    const descArea = document.querySelector('textarea[placeholder*="简介"]') as HTMLTextAreaElement | null;
    if (descArea) {
      descArea.focus();
      descArea.value = description || content || "";
      descArea.dispatchEvent(new Event("input", { bubbles: true }));
      descArea.dispatchEvent(new Event("change", { bubbles: true }));
    }

    // 封面：先点"手动上传封面"区域，弹出后用 input#uploadCoverBtn 注入
    if (cover) {
      const manualEntry = document.querySelector(
        'div[class*="manualUploadCoverButton_"], div[class*="uploadAddArea___"]',
      ) as HTMLElement | null;
      manualEntry?.click();
      await new Promise((resolve) => setTimeout(resolve, 800));
      const coverInput = document.querySelector("input#uploadCoverBtn") as HTMLInputElement | null;
      if (coverInput) {
        const cBuf = await (await fetch(cover.url)).arrayBuffer();
        const coverFile = new File([cBuf], cover.name, { type: cover.type || "image/png" });
        const cdt = new DataTransfer();
        cdt.items.add(coverFile);
        coverInput.files = cdt.files;
        coverInput.dispatchEvent(new Event("change", { bubbles: true }));
        await new Promise((resolve) => setTimeout(resolve, 1500));
        const confirmBtn = document.querySelector('button[dt-mpid="上传封面确定"]') as HTMLElement | null;
        confirmBtn?.click();
      }
    }
  } catch (error) {
    console.error("腾讯视频发布失败:", error);
  }
}
