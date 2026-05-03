import type { DynamicData, SyncData } from "../common";

// 不支持发布视频
export async function DynamicToutiao(data: SyncData) {
  function waitForElement(selector: string, timeout = 10000): Promise<Element> {
    return new Promise((resolve, reject) => {
      const element = document.querySelector(selector);
      if (element) {
        resolve(element);
        return;
      }

      const observer = new MutationObserver(() => {
        const element = document.querySelector(selector);
        if (element) {
          resolve(element);
          observer.disconnect();
        }
      });

      observer.observe(document.body, {
        childList: true,
        subtree: true,
      });

      setTimeout(() => {
        observer.disconnect();
        reject(new Error(`Element with selector "${selector}" not found within ${timeout}ms`));
      }, timeout);
    });
  }

  try {
    const { content, images, title } = data.data as DynamicData;

    // 等待编辑器出现
    const editor = (await waitForElement('div[contenteditable="true"]')) as HTMLElement;
    await new Promise((resolve) => setTimeout(resolve, 1000));

    if (editor) {
      // 更新编辑器内容，将标题和内容合并
      const combinedContent = title ? `${title}\n\n${content || ""}` : content || "";
      editor.innerText = combinedContent;
      editor.focus();
      editor.dispatchEvent(new Event("input", { bubbles: true }));
      await new Promise((resolve) => setTimeout(resolve, 3000));
    }

    // 清除已有图片
    const clearExistingImages = async () => {
      for (let i = 0; i < 20; i++) {
        const closeButton = document.querySelector(".image-remove-btn") as HTMLElement;
        if (!closeButton) break;
        closeButton.click();
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    };
    await clearExistingImages();

    // 处理图片上传
    if (images?.length > 0) {
      const uploadButtons = document.querySelectorAll("button.syl-toolbar-button");
      const uploadButton = Array.from(uploadButtons).find((button) => button.textContent?.includes("图片"));

      if (uploadButton) {
        uploadButton.dispatchEvent(new Event("click", { bubbles: true }));
        await new Promise((resolve) => setTimeout(resolve, 1000));

        const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
        if (fileInput) {
          const dataTransfer = new DataTransfer();

          for (const image of images) {
            if (!image.type.startsWith("image/")) {
              console.log("跳过非图片文件:", image);
              continue;
            }

            const response = await fetch(image.url);
            const arrayBuffer = await response.arrayBuffer();
            const file = new File([arrayBuffer], image.name, { type: image.type });
            dataTransfer.items.add(file);
          }

          if (dataTransfer.files.length > 0) {
            fileInput.files = dataTransfer.files;
            fileInput.dispatchEvent(new Event("change", { bubbles: true }));
            fileInput.dispatchEvent(new Event("input", { bubbles: true }));
          }

          // 等待上传完成：轮询 confirm 按钮变为可点击（未 disabled），最多 60s
          const confirmSelector = 'button[data-e2e="imageUploadConfirm-btn"]';
          let confirmButton: HTMLButtonElement | null = null;
          const uploadDeadline = Date.now() + 60000;
          while (Date.now() < uploadDeadline) {
            const btn = document.querySelector(confirmSelector) as HTMLButtonElement | null;
            if (btn && !btn.disabled && !btn.getAttribute("disabled")) {
              confirmButton = btn;
              break;
            }
            await new Promise((resolve) => setTimeout(resolve, 500));
          }
          if (!confirmButton) {
            console.warn("[MultiPost/toutiao] 图片上传等待超时，未检测到可点击的确认按钮");
            return;
          }

          // 点击确认按钮
          confirmButton.dispatchEvent(new Event("click", { bubbles: true }));

          // 等确认弹窗消失 + 编辑器里出现图片缩略图，最多 30s
          const insertDeadline = Date.now() + 30000;
          while (Date.now() < insertDeadline) {
            const dialogGone = !document.querySelector(confirmSelector);
            const thumb = document.querySelector(".image-remove-btn, .byte-upload-image, .syl-image");
            if (dialogGone && thumb) break;
            await new Promise((resolve) => setTimeout(resolve, 500));
          }
          await new Promise((resolve) => setTimeout(resolve, 1000));
        }
      }
    }

    // 发布内容
    const publishButton = document.querySelector("button.publish-content") as HTMLButtonElement;
    if (publishButton) {
      if (data.isAutoPublish) {
        publishButton.dispatchEvent(new Event("click", { bubbles: true }));
      }
    }
  } catch (error) {
    console.error("头条发布过程中出错:", error);
  }
}
