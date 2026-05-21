import type { SyncData, VideoData } from "../common";

export async function VideoYouku(data: SyncData) {
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
    const { title, content, video, tags, cover, description } = data.data as VideoData;
    if (!video) {
      console.error("优酷：未提供视频文件");
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

    // 标题（优酷用 input#title）
    const titleInput = document.querySelector("input#title") as HTMLInputElement | null;
    if (titleInput && title) {
      titleInput.focus();
      titleInput.value = title;
      titleInput.dispatchEvent(new Event("input", { bubbles: true }));
      titleInput.dispatchEvent(new Event("change", { bubbles: true }));
    }

    // 简介
    const descTextarea = document.querySelector('textarea[placeholder="请输入视频简介"]') as HTMLTextAreaElement | null;
    if (descTextarea) {
      descTextarea.focus();
      descTextarea.value = description || content || "";
      descTextarea.dispatchEvent(new Event("input", { bubbles: true }));
      descTextarea.dispatchEvent(new Event("change", { bubbles: true }));
    }

    // 标签
    if (tags?.length) {
      const tagInput = document.querySelector('input[placeholder*="标签"]') as HTMLInputElement | null;
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

    // 封面：优酷有多个 imgUpload input，取第一个
    if (cover) {
      const coverInputs = document.querySelectorAll(
        "input[type='file'][id*='-imgUpload']",
      ) as NodeListOf<HTMLInputElement>;
      const coverInput = coverInputs[0];
      if (coverInput) {
        const cBuf = await (await fetch(cover.url)).arrayBuffer();
        const coverFile = new File([cBuf], cover.name, { type: cover.type || "image/png" });
        const cdt = new DataTransfer();
        cdt.items.add(coverFile);
        coverInput.files = cdt.files;
        coverInput.dispatchEvent(new Event("change", { bubbles: true }));
        await new Promise((resolve) => setTimeout(resolve, 2000));
        // 裁剪框出现后点确定
        const cropBtn = document.querySelector("img.bi-cropper-cropBtnIcon") as HTMLElement | null;
        cropBtn?.click();
      }
    }
  } catch (error) {
    console.error("优酷视频发布失败:", error);
  }
}
