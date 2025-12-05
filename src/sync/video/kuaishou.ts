import type { SyncData, VideoData } from "../common";

export async function VideoKuaishou(data: SyncData) {
  const { content, video, title, tags = [], cover, scheduledPublishTime } = data.data as VideoData;

  function formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    const seconds = String(date.getSeconds()).padStart(2, "0");
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
  }

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

  // 辅助函数：上传视频
  async function uploadVideo() {
    await waitForElement('input[type="file"]');
    await new Promise((resolve) => setTimeout(resolve, 1000));

    if (!video) {
      console.error("没有视频文件");
      return;
    }

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    if (!fileInput) {
      console.error("未找到文件输入元素");
      return;
    }

    try {
      // Support both url and blobUrl
      const videoUrl = video.url;
      const response = await fetch(videoUrl);
      if (!response.ok) {
        throw new Error(`HTTP 错误! 状态: ${response.status}`);
      }
      const buffer = await response.arrayBuffer();
      const file = new File([buffer], video.name, { type: video.type });

      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(file);
      fileInput.files = dataTransfer.files;

      fileInput.dispatchEvent(new Event("change", { bubbles: true }));
      fileInput.dispatchEvent(new Event("input", { bubbles: true }));
      console.log("文件上传操作完成");
    } catch (error) {
      console.error("上传视频失败:", error);
    }
  }

  // 辅助函数：上传封面
  async function uploadCover() {
    if (!cover) return;

    const coverSettingsSpan = Array.from(document.querySelectorAll("span")).find((el) =>
      el.textContent?.includes("封面设置"),
    );

    if (!coverSettingsSpan) {
      console.error('未找到 "封面设置" 按钮');
      return;
    }

    const coverUploadButton = coverSettingsSpan.parentElement?.nextElementSibling?.firstChild
      ?.firstChild as HTMLElement;
    if (!coverUploadButton) {
      console.error("未找到封面上传区域");
      return;
    }

    coverUploadButton.click();

    try {
      await waitForElement("div.ant-modal-body");
    } catch (error) {
      console.error("封面设置弹窗未出现", error);
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 3000));

    while (true) {
      const loadingSpan = Array.from(document.querySelectorAll("div.ant-modal-body span")).find(
        (el) => el.textContent === "加载中",
      );
      if (loadingSpan) {
        await new Promise((resolve) => setTimeout(resolve, 3000));
      } else {
        break;
      }
    }

    const uploadCoverDiv = Array.from(document.querySelectorAll("div.ant-modal-body div")).find(
      (el) => el.textContent === "上传封面",
    );

    if (!uploadCoverDiv) {
      console.error('未找到 "上传封面" 按钮');
      return;
    }
    (uploadCoverDiv as HTMLElement).click();

    const fileInput = (await waitForElement("div.ant-modal-body input[type='file']")) as HTMLInputElement;
    if (!fileInput) {
      console.error("未找到封面上传的 file input");
      return;
    }

    const dataTransfer = new DataTransfer();
    if (cover.type?.includes("image/")) {
      try {
        // Support both url and blobUrl
        const coverUrl = cover.url;
        const response = await fetch(coverUrl);
        if (!response.ok) {
          throw new Error(`HTTP 错误! 状态: ${response.status}`);
        }
        const buffer = await response.arrayBuffer();
        const file = new File([buffer], cover.name, { type: cover.type });
        dataTransfer.items.add(file);
      } catch (error) {
        console.error("上传封面失败:", error);
      }
    }

    if (dataTransfer.files.length === 0) {
      console.error("没有要上传的封面文件");
      return;
    }

    fileInput.files = dataTransfer.files;
    fileInput.dispatchEvent(new Event("change", { bubbles: true }));
    fileInput.dispatchEvent(new Event("input", { bubbles: true }));

    await new Promise((resolve) => setTimeout(resolve, 3000));

    const confirmButton = Array.from(document.querySelectorAll("button")).find(
      (el) => el.textContent?.trim() === "确认",
    ) as HTMLElement;

    if (confirmButton) {
      confirmButton.click();
    } else {
      console.error("未找到'确认'按钮");
    }
  }

  // 上传视频
  await uploadVideo();

  // 填写内容
  const contentEditor = (await waitForElement('div[contenteditable="true"]')) as HTMLDivElement;
  if (contentEditor) {
    // 组合标题、内容和标签（限制标签为4个）
    const limitedTags = tags.slice(0, 4);
    const formattedContent = `${title || ""}\n${content}\n${limitedTags.map((tag) => `#${tag}`).join(" ")}`;

    // 先点击再focus
    contentEditor.click();
    await new Promise((resolve) => setTimeout(resolve, 500));
    contentEditor.focus();

    // 使用 ClipboardEvent 来粘贴内容
    const pasteEvent = new ClipboardEvent("paste", {
      bubbles: true,
      cancelable: true,
      clipboardData: new DataTransfer(),
    });
    pasteEvent.clipboardData?.setData("text/plain", formattedContent);
    contentEditor.dispatchEvent(pasteEvent);
    await new Promise((resolve) => setTimeout(resolve, 1000));
    contentEditor.blur();
  }

  // 上传封面
  if (cover) {
    await uploadCover();
  }

  // 定时发布功能
  if (scheduledPublishTime && scheduledPublishTime > 0) {
    const labels = document.querySelectorAll("label");
    const scheduledPublishLabel = Array.from(labels).find((el) => el.textContent?.includes("定时发布"));

    if (scheduledPublishLabel) {
      scheduledPublishLabel.click();
      await new Promise((resolve) => setTimeout(resolve, 500));

      const publishTimeInput = document.querySelector('input[placeholder="选择日期时间"]') as HTMLInputElement;
      if (publishTimeInput) {
        const publishDate = new Date(scheduledPublishTime);
        publishTimeInput.value = formatDate(publishDate);
        publishTimeInput.dispatchEvent(new Event("input", { bubbles: true }));
        publishTimeInput.dispatchEvent(new Event("change", { bubbles: true }));
        await new Promise((resolve) => setTimeout(resolve, 2000));

        const confirmLis = document.querySelectorAll("li.ant-picker-ok");
        const confirmLi = Array.from(confirmLis).find((el) => el.textContent === "确定");
        if (confirmLi) {
          const confirmButton = confirmLi.querySelector("button");
          if (confirmButton) {
            confirmButton.click();
          }
        }
      }
    }
    // 等待内容更新
    await new Promise((resolve) => setTimeout(resolve, 5000));

    // 发布按钮逻辑
    const divElements = document.querySelectorAll("div");
    const publishButton = Array.from(divElements).find((el) => el.textContent === "发布") as HTMLElement;

    if (publishButton) {
      console.log("找到发布按钮，准备点击");
      publishButton.click();
    } else {
      console.error('未找到"发布"按钮');
    }
  }
}
