import type { FileData, SyncData, VideoData } from "../common";

export async function VideoBilibili(data: SyncData) {
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

  const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

  function findCoverEntry(): { element: HTMLElement; isFallbackEntry: boolean } | null {
    const existingEntry = document.querySelector("div.cover-main-img > div.img") as HTMLElement | null;
    if (existingEntry) return { element: existingEntry, isFallbackEntry: false };

    const coverMain = document.querySelector("div.cover-main") as HTMLElement | null;
    const fallbackEntry = Array.from(coverMain?.querySelectorAll<HTMLElement>("span") ?? []).find(
      (span) => span.textContent?.includes("更换封面") || span.textContent?.includes("封面设置"),
    );
    if (fallbackEntry) return { element: fallbackEntry, isFallbackEntry: true };

    return null;
  }

  function findDoneButton(): HTMLElement | null {
    const footerButton = Array.from(document.querySelectorAll<HTMLElement>("div.cover-select-footer-pick button")).find(
      (btn) => btn.textContent?.trim() === "完成",
    );
    if (footerButton) return footerButton;

    return (
      Array.from(document.querySelectorAll<HTMLElement>("div.submit")).find(
        (button) => button.textContent?.trim() === "完成",
      ) ?? null
    );
  }

  function applyOriginalDeclaration(isOriginal: boolean): void {
    const originalCheckbox = document.querySelector(
      "div.original-input-wrp input[type='checkbox']",
    ) as HTMLInputElement | null;
    if (originalCheckbox) {
      if (isOriginal && !originalCheckbox.checked) {
        originalCheckbox.click();
        console.log("已勾选原创声明");
      } else if (!isOriginal && originalCheckbox.checked) {
        originalCheckbox.click();
        console.log("已取消原创声明");
      }
      return;
    }

    const radioLabels = isOriginal ? ["自制"] : ["转载", "非自制"];
    const originalRadio = Array.from(document.querySelectorAll<HTMLElement>("span.check-radio-v2-name")).find((span) =>
      radioLabels.some((label) => span.textContent?.trim() === label || span.textContent?.includes(label)),
    );
    if (originalRadio) {
      originalRadio.click();
      console.log(isOriginal ? "已选择自制原创声明" : "已选择转载原创声明");
    } else {
      console.log(isOriginal ? "未找到自制原创声明单选项" : "未找到转载原创声明单选项");
    }
  }

  async function uploadCover(cover: FileData): Promise<boolean> {
    console.log("开始上传封面", cover);
    await waitForElementOptional("div.cover-main-img > div.img, div.cover-main");
    const coverEntry = findCoverEntry();
    if (!coverEntry) {
      console.log("未找到封面上传按钮");
      return false;
    }

    coverEntry.element.click();
    await sleep(coverEntry.isFallbackEntry ? 1500 : 1000);

    const tabContainer = document.querySelector("div.cover-select-header-tab");
    if (tabContainer) {
      const uploadTab = tabContainer.firstChild?.nextSibling as HTMLElement;
      if (!uploadTab) {
        console.log("未找到上传封面tab");
        return false;
      }
      uploadTab.click();
      await sleep(1000);
    } else {
      console.log("未找到封面选择的tab容器，尝试直接查找上传输入框");
    }

    const fileInput = document.querySelector(
      "div.bcc-upload-wrapper > input[type='file'][accept='image/png, image/jpeg']",
    ) as HTMLInputElement;

    if (!fileInput) {
      console.log("未找到封面上传的文件输入框");
      return false;
    }

    const dataTransfer = new DataTransfer();
    if (cover.type && !cover.type.includes("image/")) {
      console.log("封面文件类型不正确");
      return false;
    }

    const response = await fetch(cover.url);
    const blob = await response.blob();
    const coverFile = new File([blob], cover.name, { type: cover.type || "image/png" });
    dataTransfer.items.add(coverFile);

    if (dataTransfer.files.length === 0) {
      return false;
    }

    fileInput.files = dataTransfer.files;
    fileInput.dispatchEvent(new Event("change", { bubbles: true }));
    fileInput.dispatchEvent(new Event("input", { bubbles: true }));

    console.log("封面文件上传操作已触发");
    await sleep(3000);

    const doneButton = findDoneButton();

    if (doneButton) {
      (doneButton as HTMLElement).click();
      console.log("封面上传完成");
      return true;
    }
    console.log('未找到"完成"按钮');
    return false;
  }

  async function uploadVideo(file: File): Promise<boolean> {
    const fileInput = (await waitForElementOptional('input[type="file"]')) as HTMLInputElement | null;
    if (!fileInput) {
      console.log("未找到视频上传文件输入框");
      return false;
    }

    // 创建一个新的 File 对象，因为某些浏览器可能不允许直接设置 fileInput.files
    const dataTransfer = new DataTransfer();
    dataTransfer.items.add(file);
    fileInput.files = dataTransfer.files;

    // 触发 change 事件
    const changeEvent = new Event("change", { bubbles: true });
    fileInput.dispatchEvent(changeEvent);

    console.log("视频上传事件已触发");
    return true;
  }

  async function waitForUploadCompletion(timeout = 600000): Promise<void> {
    return new Promise((resolve, reject) => {
      const checkInterval = setInterval(() => {
        const spans = document.querySelectorAll("span");
        const uploadCompleteElement = Array.from(spans).find((span) => span.textContent?.includes("上传完成"));
        if (uploadCompleteElement) {
          clearInterval(checkInterval);
          console.log("视频上传完成");
          resolve();
        }
      }, 1000);

      setTimeout(() => {
        clearInterval(checkInterval);
        reject(new Error("视频上传超时"));
      }, timeout);
    });
  }

  try {
    const { content, video, title, tags, cover, horizontalCover, description, original } = data.data as VideoData;

    // 视频简介优先使用 description（独立字段），未提供时回退到 content
    const videoDescription = description ?? content;
    // 原创声明:用户未明确指定时默认为原创(B 站投稿默认勾选)
    const isOriginal = original !== false;

    // 处理视频上传
    if (video) {
      await waitForElementOptional('input[type="file"]');
      await sleep(1000);

      const response = await fetch(video.url);
      const blob = await response.arrayBuffer();
      const extension = video.name.split(".").pop() || "mp4";
      const videoFilename = `${title}.${extension}`;
      const videoFile = new File([blob], videoFilename, { type: video.type });

      console.log(`视频文件: ${videoFile.name} ${videoFile.type} ${videoFile.size}`);

      const videoUploadTriggered = await uploadVideo(videoFile);
      if (!videoUploadTriggered) return;
      console.log("视频上传已初始化");

      try {
        await waitForUploadCompletion();
        console.log("视频上传已完成，继续后续操作");
      } catch (error) {
        console.error("等待视频上传完成时出错:", error);
        return;
      }
    } else {
      console.error("没有视频文件");
      return;
    }

    // Handle title input.
    const titleInput =
      ((await waitForElementOptional('input[maxlength="80"][type="text"]')) as HTMLInputElement | null) ||
      ((await waitForElementOptional('input.input-val[type="text"][maxlength="80"]', 3000)) as HTMLInputElement | null);
    if (title) {
      if (titleInput) {
        titleInput.focus();
        titleInput.value = title;
        titleInput.dispatchEvent(new Event("input", { bubbles: true }));
        titleInput.dispatchEvent(new Event("change", { bubbles: true }));
        console.log("标题已输入:", title);
      } else {
        console.log("未找到标题输入框");
      }
    }

    // 等待简介编辑器出现并输入内容
    const editor = (await waitForElementOptional('div.ql-editor[contenteditable="true"]')) as HTMLDivElement | null;
    if (editor) {
      editor.innerHTML = videoDescription || "";
      console.log("简介已输入:", videoDescription);
    } else {
      console.log("未找到简介编辑器");
    }

    // Original declaration defaults to self-made; explicit false cancels it when the checkbox exists.
    applyOriginalDeclaration(isOriginal);

    await sleep(3000);

    // Handle tags best-effort.
    try {
      const existingTags = document.querySelectorAll("div.tag-pre-wrp > div.label-item-v2-container");
      console.log(`发现 ${existingTags.length} 个已有标签，准备清除...`);
      for (let i = 0; i < existingTags.length; i++) {
        const tag = existingTags[i] as HTMLElement;
        const closeButton = tag.querySelector(".label-item-v2-close");
        if (closeButton) {
          (closeButton as HTMLElement).click();
          await sleep(400);
        }
      }

      if (!tags || tags.length === 0) {
        console.log("未指定标签，选择热门标签...");
        const hotTags = document.querySelectorAll(".hot-tag-item");
        if (hotTags.length > 0) {
          for (let i = 0; i < 3 && i < hotTags.length; i++) {
            const tag = hotTags[i] as HTMLElement;
            tag.click();
            await sleep(1000);
          }
        }
      } else {
        console.log("添加指定标签...");
        const tagInput = document.querySelector('input[placeholder="按回车键Enter创建标签"]') as HTMLInputElement;
        if (tagInput) {
          for (const tag of tags.slice(0, 10)) {
            tagInput.value = tag;
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
      }
    } catch (error) {
      console.warn("Bilibili 标签处理失败，继续发布流程:", error);
    }

    // Upload one cover best-effort.
    const coverToUpload = horizontalCover || cover;
    if (coverToUpload) {
      await uploadCover(coverToUpload).catch((error) => {
        console.warn("Bilibili 封面上传失败，继续发布流程:", error);
        return false;
      });
    }

    // 等待标签和封面处理完成
    await sleep(5000);

    // 如果需要自动发布
    if (data.isAutoPublish) {
      const submitButton = document.querySelector("span.submit-add") as HTMLElement;
      if (submitButton) {
        console.log("点击发布按钮");
        submitButton.click();
      } else {
        console.log('未找到"发送"按钮');
      }
    }
  } catch (error) {
    console.error("BilibiliVideo 发布过程中出错:", error);
  }
}
