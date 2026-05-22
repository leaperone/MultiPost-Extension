import type { SyncData, VideoData } from "../common";

export async function VideoIqiyi(data: SyncData) {
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
    const { title, content, video, tags, cover, description, original } = data.data as VideoData;
    if (!video) {
      console.error("爱奇艺：未提供视频文件");
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

    // 标题（爱奇艺标题最长 30 字）
    const titleInput = document.querySelector(
      'input[type="text"][maxlength], input[placeholder*="标题"]',
    ) as HTMLInputElement | null;
    if (titleInput && title) {
      titleInput.focus();
      titleInput.value = title.slice(0, 30);
      titleInput.dispatchEvent(new Event("input", { bubbles: true }));
      titleInput.dispatchEvent(new Event("change", { bubbles: true }));
    }

    // 简介
    const descTextarea = document.querySelector('textarea[placeholder="输入视频简介"]') as HTMLTextAreaElement | null;
    if (descTextarea) {
      descTextarea.focus();
      descTextarea.value = description || content || "";
      descTextarea.dispatchEvent(new Event("input", { bubbles: true }));
      descTextarea.dispatchEvent(new Event("change", { bubbles: true }));
    }

    // 标签
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

    // 原创声明（默认是原创；用户传 false 时切到非原创）
    if (original === false) {
      const nonOriginalRadio = document.querySelectorAll('input[type="radio"][class*="mp-radio__original"]')[1] as
        | HTMLInputElement
        | undefined;
      nonOriginalRadio?.click();
    }

    // 封面：先点 set-cover，弹出编辑器再走 base-cover-new 内部 file input
    if (cover) {
      const coverEntry = document.querySelector("div.set-cover") as HTMLElement | null;
      coverEntry?.click();
      await new Promise((resolve) => setTimeout(resolve, 1000));
      const coverPanel = Array.from(document.querySelectorAll("div.base-cover-new")).find(
        (d) => window.getComputedStyle(d).display !== "none",
      );
      const coverInput = coverPanel?.querySelector(
        "div.cover-editor-wrap input[type='file'][accept='.jpg,.jpeg,.png']",
      ) as HTMLInputElement | null;
      if (coverInput) {
        const cBuf = await (await fetch(cover.url)).arrayBuffer();
        const coverFile = new File([cBuf], cover.name, { type: cover.type || "image/png" });
        const cdt = new DataTransfer();
        cdt.items.add(coverFile);
        coverInput.files = cdt.files;
        coverInput.dispatchEvent(new Event("change", { bubbles: true }));
        await new Promise((resolve) => setTimeout(resolve, 2000));
        const confirmBtn = coverPanel?.querySelector(
          "div.mp-popup-btn.editor-modal-bottom button",
        ) as HTMLElement | null;
        confirmBtn?.click();
      }
    }
  } catch (error) {
    console.error("爱奇艺视频发布失败:", error);
  }
}
