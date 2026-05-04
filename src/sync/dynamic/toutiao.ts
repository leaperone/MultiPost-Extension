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

            let arrayBuffer: ArrayBuffer | null = null;
            try {
              const direct = await fetch(image.url);
              if (!direct.ok) throw new Error(`HTTP ${direct.status}`);
              arrayBuffer = await direct.arrayBuffer();
            } catch (e) {
              console.warn("[MultiPost/toutiao] 直连 fetch 失败，回退 background 代取:", e);
              const resp = await chrome.runtime.sendMessage({
                action: "MULTIPOST_FETCH_IMAGE",
                url: image.url,
              });
              if (!resp || !resp.ok || !resp.base64) {
                console.error("[MultiPost/toutiao] background fetch 也失败:", resp);
                continue;
              }
              const bin = atob(resp.base64);
              const bytes = new Uint8Array(bin.length);
              for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
              arrayBuffer = bytes.buffer;
            }
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

        const startUrl = location.href;
        const deadline = Date.now() + 45000;
        let finalUrl: string | null = null;
        while (Date.now() < deadline) {
          await new Promise((r) => setTimeout(r, 1000));
          const cur = location.href;
          // 头条发布成功后跳转到 /publish?edit_id=xxx（可再次编辑）
          if (cur !== startUrl && cur.includes("edit_id=")) {
            finalUrl = cur;
            break;
          }
        }
        const reportUrl = finalUrl || location.href;
        try {
          chrome.runtime.sendMessage({
            action: "MULTIPOST_REPORT_LINK",
            platform: "DYNAMIC_TOUTIAO",
            link: reportUrl,
          });
          console.log("[MultiPost/toutiao] reported link:", reportUrl);
        } catch (e) {
          console.warn("[MultiPost/toutiao] report failed:", e);
        }
      }
    }
  } catch (error) {
    console.error("头条发布过程中出错:", error);
  }
}
