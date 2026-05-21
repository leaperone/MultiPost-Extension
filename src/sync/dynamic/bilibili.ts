import type { DynamicData, SyncData } from "../common";

// 不支持发布视频
export async function DynamicBilibili(data: SyncData) {
  // injectFunction 是被 chrome.scripting.executeScript 序列化注入的，
  // 闭包外的 import 不会随之带过去，所以工具函数必须就地声明。

  function waitForElement(selector: string, timeout = 10000): Promise<Element> {
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

  async function checkImageUploadCompletion(
    expectedNewCount: number,
    initialCount: number,
    maxAttempts = 30,
    interval = 1000,
  ): Promise<void> {
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const currentSuccessCount = document.querySelectorAll("div.bili-pics-uploader__item.success").length;
      const newlyUploadedCount = currentSuccessCount - initialCount;
      if (newlyUploadedCount === expectedNewCount) {
        console.log(`所有 ${expectedNewCount} 张新图片已成功上传`);
        return;
      }
      await new Promise((resolve) => setTimeout(resolve, interval));
    }
    const finalSuccessCount = document.querySelectorAll("div.bili-pics-uploader__item.success").length;
    console.warn(`图片上传检查超时：预期新增 ${expectedNewCount} 张，实际新增 ${finalSuccessCount - initialCount} 张`);
  }

  async function cleanUploadedImages(): Promise<void> {
    for (let i = 0; i < 20; i++) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      const removeButton = document.querySelector("div.bili-pics-uploader__item__remove") as HTMLElement | null;
      if (!removeButton) return;
      removeButton.click();
    }
  }

  try {
    const { content, images, title, tags } = data.data as DynamicData;

    // 等待编辑器出现
    const editor = (await waitForElement(
      'div[placeholder="有什么想和大家分享的？"][contenteditable="true"]',
    )) as HTMLDivElement;
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // 把 tags 拼到正文末尾（B 站动态目前没有独立 hashtag 字段）
    const tagSuffix = tags && tags.length > 0 ? ` ${tags.map((t) => `#${t}#`).join(" ")}` : "";
    const finalContent = `${content || ""}${tagSuffix}`;

    editor.focus();
    editor.textContent = "";
    editor.textContent = finalContent;

    editor.dispatchEvent(
      new InputEvent("input", {
        bubbles: true,
        cancelable: true,
        inputType: "insertText",
        data: finalContent,
      }),
    );

    if (title) {
      const titleInput = (await waitForElement("input.bili-dyn-publishing__title__input")) as HTMLInputElement;
      titleInput.focus();
      titleInput.value = title;
      titleInput.dispatchEvent(new Event("input", { bubbles: true }));
      titleInput.dispatchEvent(new Event("change", { bubbles: true }));
    }

    // 不管这次有没有图，都要先清掉编辑器里残留的图片，
    // 否则上一次的草稿会跟着发出去（B 站动态编辑器会持久化未发布的图）。
    const uploadModule = document.querySelector("div.bili-dyn-publishing__image-upload") as HTMLDivElement | null;
    if (uploadModule) uploadModule.style.display = "block";
    await cleanUploadedImages();

    // 图片上传：唤起 B 站自带上传 UI，再把 File 通过 postMessage 交给 MAIN world helper
    // （helper 调 input.files + 触发 change，让 B 站 SDK 自己上传）
    if (images && images.length > 0) {
      const imageData: File[] = [];
      for (const file of images) {
        const blob = await (await fetch(file.url)).blob();
        imageData.push(new File([blob], file.name, { type: file.type || blob.type }));
      }
      await new Promise((resolve) => setTimeout(resolve, 800));

      const initialSuccessCount = document.querySelectorAll("div.bili-pics-uploader__item.success").length;

      window.postMessage({ type: "BILIBILI_DYNAMIC_UPLOAD_IMAGES", files: imageData }, "*");

      await checkImageUploadCompletion(images.length, initialSuccessCount);
    }

    if (data.isAutoPublish) {
      const maxAttempts = 3;
      for (let attempt = 0; attempt < maxAttempts; attempt++) {
        const publishButton = document.querySelector(
          "div.bili-dyn-publishing__action.launcher",
        ) as HTMLDivElement | null;
        if (publishButton) {
          publishButton.click();
          await new Promise((resolve) => setTimeout(resolve, 3000));
          window.location.reload();
          return;
        }
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    } else {
      const publishButton = (await waitForElement("div.bili-dyn-publishing__action.launcher")) as HTMLDivElement;
      publishButton.addEventListener("click", async () => {
        await new Promise((resolve) => setTimeout(resolve, 3000));
        window.location.reload();
      });
    }
  } catch (error) {
    console.error("B 站动态发布失败:", error);
  }
}
