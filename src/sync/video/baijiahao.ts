import type { FileData, SyncData, VideoData } from "../common";

export async function VideoBaijiahao(data: SyncData) {
  const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

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

  async function waitForElementOptional(selector: string, timeout = 10000): Promise<Element | null> {
    return waitForElement(selector, timeout).catch(() => null);
  }

  async function uploadVideo(file: File): Promise<boolean> {
    const fileInput = (await waitForElementOptional('input[type="file"]')) as HTMLInputElement | null;
    if (!fileInput) {
      console.error("未找到百家号视频文件输入框");
      return false;
    }
    await sleep(3000);

    console.log("找到文件输入框:", fileInput);

    const dataTransfer = new DataTransfer();
    dataTransfer.items.add(file);
    fileInput.files = dataTransfer.files;

    // 触发必要的事件
    const changeEvent = new Event("change", { bubbles: true });
    fileInput.dispatchEvent(changeEvent);

    const inputEvent = new Event("input", { bubbles: true });
    fileInput.dispatchEvent(inputEvent);

    console.log("文件上传操作完成");
    return true;
  }

  async function waitForUploadCompletion(timeout = 600000): Promise<boolean> {
    return new Promise((resolve, reject) => {
      const checkInterval = setInterval(() => {
        const spans = document.querySelectorAll("span");
        const uploadCompleteElement = Array.from(spans).find((span) => span.textContent?.includes("上传完成"));
        if (uploadCompleteElement) {
          clearInterval(checkInterval);
          console.log("视频上传完成");
          resolve(true);
        }
      }, 1000);

      setTimeout(() => {
        clearInterval(checkInterval);
        reject(new Error("视频上传超时"));
      }, timeout);
    });
  }

  async function fetchCoverFile(cover: FileData): Promise<File | null> {
    if (cover.type && !cover.type.includes("image/")) {
      console.log("Cover is not an image, skipping upload");
      return null;
    }

    const response = await fetch(cover.url);
    const arrayBuffer = await response.arrayBuffer();
    return new File([arrayBuffer], cover.name, { type: cover.type || "image/png" });
  }

  async function uploadCover(cover: FileData, coverIndex: 0 | 1, label: string): Promise<boolean> {
    console.log("tryCover", label, cover);

    await waitForElementOptional("div.cheetah-upload span.cheetah-upload div.cheetah-spin-container", 5000);
    const coverUploadContainers = document.querySelectorAll(
      "div.cheetah-upload span.cheetah-upload div.cheetah-spin-container",
    );
    console.log("coverUploads", coverUploadContainers);
    const coverUploadContainer = coverUploadContainers[coverIndex] as HTMLElement | undefined;
    if (!coverUploadContainer) {
      console.log(`未找到百家号${label}封面入口`);
      return false;
    }

    const coverUploadButton =
      ((coverUploadContainer.firstChild as HTMLElement | null)?.firstChild as HTMLElement | null) ||
      (coverUploadContainer.firstChild as HTMLElement | null);
    console.log("coverUploadButton", coverUploadButton);
    if (!coverUploadButton) return false;

    coverUploadButton.click();
    await sleep(3000);

    const modals = document.querySelectorAll("div.cheetah-modal-body");
    const modal = (coverIndex === 1 && modals.length > 1 ? modals[1] : modals[0]) as HTMLElement | undefined;
    console.log("modal", modal);
    if (!modal) return false;

    const fileInput =
      (modal.querySelector(
        "div.cheetah-tabs-content span.cheetah-upload input[name='media'][accept='image/*']",
      ) as HTMLInputElement | null) ||
      (modal.querySelector("div.cheetah-tabs-content input[name='media']") as HTMLInputElement | null);
    console.log("fileInput", fileInput);
    if (!fileInput) return false;

    const dataTransfer = new DataTransfer();

    console.log("try upload file", cover);
    const coverFile = await fetchCoverFile(cover);
    if (!coverFile) return false;

    dataTransfer.items.add(coverFile);

    if (dataTransfer.files.length === 0) return false;

    fileInput.files = dataTransfer.files;

    const changeEvent = new Event("change", { bubbles: true });
    fileInput.dispatchEvent(changeEvent);

    const inputEvent = new Event("input", { bubbles: true });
    fileInput.dispatchEvent(inputEvent);

    console.log("文件上传操作触发");
    await sleep(3000);

    const doneButtons = modal.querySelectorAll("button");
    console.log("doneButtons", doneButtons);

    const doneButton = Array.from(doneButtons).find((e) => e.textContent?.trim() === "确定");
    console.log("doneButton", doneButton);

    if (doneButton) {
      (doneButton as HTMLElement).click();
      return true;
    }
    return false;
  }

  try {
    const { content, video, title, tags, cover, verticalCover, horizontalCover } = data.data as VideoData;

    if (!video) {
      console.error("没有视频文件");
      return;
    }

    // 处理视频上传
    const response = await fetch(video.url);
    const arrayBuffer = await response.arrayBuffer();
    const videoFile = new File([arrayBuffer], `${title || "video"}.${video.name.split(".").pop()}`, {
      type: video.type,
    });

    console.log(`准备上传视频: ${videoFile.name} (${videoFile.type}, ${videoFile.size} bytes)`);

    const videoUploadTriggered = await uploadVideo(videoFile);
    const videoUploaded = videoUploadTriggered ? await waitForUploadCompletion().catch(() => false) : false;
    if (!videoUploaded) {
      console.error("百家号视频未完成上传，跳过后续自动发布");
    }

    // 等待页面状态稳定
    await sleep(2000);

    // 处理标题输入
    const titleInput = document.querySelector('textarea[placeholder="请输入标题"]') as HTMLTextAreaElement;
    if (titleInput) {
      titleInput.value = title || "";
      titleInput.dispatchEvent(new Event("input", { bubbles: true }));
      console.log("标题已输入:", title);
    }

    // 处理描述输入
    const descriptionInput = document.querySelector('textarea[placeholder="让别人更懂你"]') as HTMLTextAreaElement;

    if (descriptionInput) {
      const description = (content || title || "").slice(0, 100);
      descriptionInput.value = description;
      descriptionInput.dispatchEvent(new Event("input", { bubbles: true }));
      console.log("描述已输入:", description);
    }

    // Handle tags best-effort.
    try {
      const tagInput = document.querySelector('input[placeholder="获得精准推荐"]') as HTMLInputElement;
      if (tagInput && tags) {
        for (const tag of tags) {
          tagInput.value = tag;
          console.log("正在输入标签:", tag);

          const enterEvent = new KeyboardEvent("keydown", {
            bubbles: true,
            cancelable: true,
            key: "Enter",
            code: "Enter",
            keyCode: 13,
            which: 13,
          });
          tagInput.dispatchEvent(enterEvent);
          await sleep(1000);
        }
      }
    } catch (error) {
      console.warn("百家号标签处理失败，继续发布流程:", error);
    }

    const verticalCoverFile = verticalCover || cover;
    const tryUploadCover = async (coverFile: FileData, coverIndex: 0 | 1, label: string) => {
      try {
        await uploadCover(coverFile, coverIndex, label);
      } catch (error) {
        console.warn(`百家号${label}封面上传失败，继续发布流程:`, error);
      }
    };

    // Upload covers best-effort. Keep slot 0 populated when only one cover is present.
    if (horizontalCover && verticalCoverFile) {
      await tryUploadCover(horizontalCover, 0, "横");
      await sleep(2000);
      await tryUploadCover(verticalCoverFile, 1, "竖");
    } else if (horizontalCover) {
      await tryUploadCover(horizontalCover, 0, "横");
    } else if (verticalCoverFile) {
      await tryUploadCover(verticalCoverFile, 0, "封面");
    }

    // 等待页面响应
    await sleep(5000);

    // 如果需要自动发布
    if (data.isAutoPublish) {
      if (!videoUploaded) {
        console.warn("百家号自动发布已跳过：视频未成功上传完成");
        return;
      }

      const publishButton = document.querySelector(
        "button.cheetah-btn.cheetah-btn-circle.cheetah-btn-primary.cheetah-btn-icon-only.cheetah-public",
      ) as HTMLButtonElement;

      if (publishButton) {
        console.log("点击发布按钮");
        publishButton.click();
      } else {
        console.log("未找到发布按钮");
      }
    }
  } catch (error) {
    console.error("百家号视频发布过程中出错:", error);
  }
}
