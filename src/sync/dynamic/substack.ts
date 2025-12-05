import type { DynamicData, FileData, SyncData } from "../common";

// Substack Notes - 支持图片和视频
export async function DynamicSubstack(data: SyncData) {
  const { title, content, images, videos } = data.data as DynamicData;

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
    // 等待页面加载
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // 点击 "New post" 按钮打开编辑器
    const newPostButton = (await waitForElement('button[type="button"][aria-label="New post"]')) as HTMLButtonElement;
    if (!newPostButton) {
      console.debug("未找到新帖子按钮");
      return;
    }
    newPostButton.click();
    console.debug("已点击新帖子按钮");

    // 等待编辑器出现
    await waitForElement('div[contenteditable="true"]');
    await new Promise((resolve) => setTimeout(resolve, 500));

    const editor = document.querySelector('div[contenteditable="true"]') as HTMLDivElement;
    if (!editor) {
      console.debug("未找到编辑器元素");
      return;
    }

    // 聚焦编辑器并清空
    editor.focus();
    editor.innerHTML = "";
    await new Promise((resolve) => setTimeout(resolve, 500));

    // 通过剪贴板粘贴内容
    const pasteEvent = new ClipboardEvent("paste", {
      bubbles: true,
      cancelable: true,
      clipboardData: new DataTransfer(),
    });
    const textContent = title ? `${title}\n${content}` : content;
    pasteEvent.clipboardData.setData("text/plain", textContent || "");
    editor.dispatchEvent(pasteEvent);
    console.debug("已填入内容");

    // 处理文件上传（图片或视频）
    const hasVideos = videos && videos.length > 0;
    const hasImages = images && images.length > 0;

    if (hasVideos || hasImages) {
      let fileInput: HTMLInputElement | null = null;
      const filesToUpload: FileData[] = [];

      if (hasVideos) {
        // 如果有视频，只上传第一个视频
        fileInput = document.querySelector('input[type="file"][accept="video/*"]') as HTMLInputElement;
        if (fileInput && videos[0]) {
          filesToUpload.push(videos[0]);
          console.debug("准备上传视频");
        }
      } else if (hasImages) {
        // 上传图片
        fileInput = document.querySelector('input[type="file"][accept="image/*,.heic"]') as HTMLInputElement;
        if (fileInput) {
          filesToUpload.push(...images);
          console.debug("准备上传图片");
        }
      }

      if (fileInput && filesToUpload.length > 0) {
        const dataTransfer = new DataTransfer();

        for (const file of filesToUpload) {
          try {
            console.debug("正在上传文件:", file.name);
            const response = await fetch(file.url);
            const arrayBuffer = await response.arrayBuffer();
            const uploadFile = new File([arrayBuffer], file.name, { type: file.type || "application/octet-stream" });
            dataTransfer.items.add(uploadFile);
          } catch (error) {
            console.error("获取文件失败:", error);
          }
        }

        if (dataTransfer.files.length > 0) {
          fileInput.files = dataTransfer.files;
          fileInput.dispatchEvent(new Event("change", { bubbles: true }));
          fileInput.dispatchEvent(new Event("input", { bubbles: true }));
          console.debug("文件上传操作完成");
          await new Promise((resolve) => setTimeout(resolve, 2000));
        }
      } else {
        console.debug("未找到文件输入元素");
      }
    }

    // 等待内容处理
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // 查找发布按钮
    const buttons = document.querySelectorAll("button");
    const sendButton = Array.from(buttons).find((btn) => btn.textContent?.includes("Post"));

    if (sendButton) {
      console.debug("找到发布按钮");
      if (data.isAutoPublish) {
        console.debug("自动发布已启用，点击发布按钮");
        sendButton.dispatchEvent(new Event("click", { bubbles: true }));
      }
    } else {
      console.debug('未找到"Post"按钮');
    }
  } catch (error) {
    console.error("Substack 发布过程中出错:", error);
  }
}
