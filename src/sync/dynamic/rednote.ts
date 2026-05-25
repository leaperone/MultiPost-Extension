import type { DynamicData, SyncData } from "../common";

// 优先发布图文
export async function DynamicRednote(data: SyncData) {
  const { title, content, images, tags } = data.data as DynamicData;
  // 辅助函数：等待元素出现
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

  // 辅助函数：上传文件
  async function uploadImages() {
    const fileInput = (await waitForElement('input[type="file"]')) as HTMLInputElement;
    if (!fileInput) {
      console.error("未找到文件输入元素");
      return;
    }

    const dataTransfer = new DataTransfer();

    for (const fileInfo of images) {
      try {
        let blob: Blob;
        try {
          const response = await fetch(fileInfo.url);
          if (!response.ok) throw new Error(`HTTP ${response.status}`);
          blob = await response.blob();
        } catch (err) {
          console.warn("[rednote] direct fetch failed, fallback to background:", err);
          const resp: any = await new Promise((resolve) => {
            chrome.runtime.sendMessage({ action: "MULTIPOST_FETCH_IMAGE", url: fileInfo.url }, (r) => resolve(r));
          });
          if (!resp || !resp.ok) throw new Error(`background fetch failed: ${resp?.error || "unknown"}`);
          const bin = atob(resp.base64);
          const arr = new Uint8Array(bin.length);
          for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
          blob = new Blob([arr], { type: fileInfo.type });
        }
        const file = new File([blob], fileInfo.name, { type: fileInfo.type });
        dataTransfer.items.add(file);
      } catch (error) {
        console.error(`上传图片 ${fileInfo.url} 失败:`, error);
      }
    }

    if (dataTransfer.files.length > 0) {
      fileInput.files = dataTransfer.files;
      fileInput.dispatchEvent(new Event("change", { bubbles: true }));
      // 轮询：等待页面出现与图片数量匹配的缩略图，最多 60s
      const expectedCount = dataTransfer.files.length;
      const uploadDeadline = Date.now() + 60000;
      while (Date.now() < uploadDeadline) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
        // 小红书上传后会渲染 .img-preview / .upload-img / img.preview-img 等节点
        const thumbs = document.querySelectorAll(
          ".img-preview, .upload-img img, .preview-img, .upload-content img, .img-container img",
        );
        if (thumbs.length >= expectedCount) {
          console.log(`[rednote] ${thumbs.length} 张图片已渲染缩略图`);
          break;
        }
      }
      console.log("文件上传操作完成");
    } else {
      console.error("没有成功添加任何文件");
    }
  }

  if (images && images.length > 0) {
    // 等待页面加载
    await waitForElement('span[class="title"]');
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // 点击上传图文按钮
    const uploadButtons = document.querySelectorAll('span[class="title"]');
    const uploadButton = Array.from(uploadButtons).find((element) =>
      element.textContent?.includes("上传图文"),
    ) as HTMLElement;

    if (!uploadButton) {
      console.error("未找到上传图文按钮");
      return;
    }

    uploadButton.click();
    uploadButton.dispatchEvent(new Event("click", { bubbles: true }));
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // 上传文件
    await uploadImages();
    // uploadImages 内部已轮询缩略图渲染；此处再缓 1s 让发布按钮变可点
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // 填写标题
    const titleInput = (await waitForElement('input[type="text"]')) as HTMLInputElement;
    if (titleInput) {
      const titleText = title || content?.slice(0, 20) || "";
      titleInput.value = titleText;
      titleInput.dispatchEvent(new Event("input", { bubbles: true }));
    }

    // 填写内容
    const contentEditor = (await waitForElement('div[contenteditable="true"]')) as HTMLDivElement;
    if (contentEditor) {
      contentEditor.focus();
      const contentPasteEvent = new ClipboardEvent("paste", {
        bubbles: true,
        cancelable: true,
        clipboardData: new DataTransfer(),
      });
      const tagSuffix = tags?.length ? ` ${tags.map((t) => `#${t}#`).join(" ")}` : "";
      contentPasteEvent.clipboardData.setData("text/plain", `${content || ""}${tagSuffix}`);
      contentEditor.dispatchEvent(contentPasteEvent);
      await new Promise((resolve) => setTimeout(resolve, 1000));
      contentEditor.blur();
      console.log("设置内容:", content);
    }

    // 自动发布
    if (data.isAutoPublish) {
      await new Promise((resolve) => setTimeout(resolve, 2000));
      const buttons = document.querySelectorAll("button");
      const publishButton = Array.from(buttons).find((button) =>
        button.textContent?.includes("发布"),
      ) as HTMLButtonElement;

      if (publishButton) {
        // 等待按钮可用
        while (publishButton.getAttribute("aria-disabled") === "true") {
          await new Promise((resolve) => setTimeout(resolve, 1000));
          console.log("等待发布按钮可用...");
        }

        console.log("点击发布按钮");
        publishButton.click();

        // 小红书点击发布后 URL 会变化（可能是 /publish/success?... 或 /publish/update?id=...）
        // 等任意 URL 变化即视为发布动作完成；最多等 30s
        const startUrl = location.href;
        const deadline = Date.now() + 30000;
        let finalUrl: string | null = null;
        while (Date.now() < deadline) {
          await new Promise((r) => setTimeout(r, 1000));
          const cur = location.href;
          if (cur !== startUrl) {
            finalUrl = cur;
            break;
          }
        }
        const reportUrl = finalUrl || location.href;
        try {
          chrome.runtime.sendMessage({
            action: "MULTIPOST_REPORT_LINK",
            platform: "DYNAMIC_REDNOTE",
            link: reportUrl,
          });
          console.log("[MultiPost/rednote] reported link:", reportUrl);
        } catch (e) {
          console.warn("[MultiPost/rednote] report failed:", e);
        }
        // 给 background 一点时间完成 fetch，再跳管理页
        await new Promise((resolve) => setTimeout(resolve, 1500));
        window.location.href = "https://creator.xiaohongshu.com/new/note-manager";
      }
    }
  }
}
