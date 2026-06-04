import type { SyncData, VideoData } from "../common";

export async function VideoZhihu(data: SyncData) {
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

  async function pasteText(element: HTMLElement, text: string): Promise<void> {
    const before =
      element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement
        ? element.value
        : element.textContent || "";
    const pasteEvent = new ClipboardEvent("paste", {
      bubbles: true,
      cancelable: true,
      clipboardData: new DataTransfer(),
    });
    pasteEvent.clipboardData.setData("text/plain", text);
    element.dispatchEvent(pasteEvent);
    await sleep(100);

    const after =
      element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement
        ? element.value
        : element.textContent || "";
    if (after !== before) {
      element.dispatchEvent(new Event("input", { bubbles: true }));
      element.dispatchEvent(new Event("change", { bubbles: true }));
      return;
    }

    if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
      element.value = `${element.value}${text}`;
    } else {
      element.textContent = `${element.textContent || ""}${text}`;
    }
    element.dispatchEvent(new Event("input", { bubbles: true }));
    element.dispatchEvent(new Event("change", { bubbles: true }));
  }

  async function uploadVideo(file: File): Promise<boolean> {
    const fileInput = (await waitForElementOptional("input[type=file]")) as HTMLInputElement | null;
    if (!fileInput) {
      console.log("未找到知乎视频上传文件输入框");
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

  async function uploadCover(cover: NonNullable<VideoData["cover"]>): Promise<boolean> {
    console.debug("tryCover", cover);
    const coverButton = (await waitForElementOptional("div.VideoUploadForm-imageEditButton")) as HTMLElement | null;
    console.debug("coverButton -->", coverButton);
    if (!coverButton) return false;

    coverButton.click();
    await waitForElementOptional("h3.Modal-title");

    const uploadTabs = document.querySelectorAll("h3.Modal-title div");
    const localUploadTab = Array.from(uploadTabs).find((tab) => tab.textContent?.trim() === "本地上传") as
      | HTMLElement
      | undefined;
    console.debug("localUploadDiv -->", localUploadTab);
    if (!localUploadTab) return false;

    localUploadTab.click();
    const fileInput = (await waitForElementOptional(
      "input[type='file'][accept='image/png,image/jpeg,image/jpg']",
    )) as HTMLInputElement | null;
    console.debug("fileInput -->", fileInput);
    if (!fileInput || (cover.type && !cover.type.includes("image/"))) return false;

    const response = await fetch(cover.url);
    const arrayBuffer = await response.arrayBuffer();
    const coverFile = new File([arrayBuffer], cover.name, { type: cover.type || "image/png" });
    const dataTransfer = new DataTransfer();
    dataTransfer.items.add(coverFile);
    fileInput.files = dataTransfer.files;
    fileInput.dispatchEvent(new Event("change", { bubbles: true }));
    fileInput.dispatchEvent(new Event("input", { bubbles: true }));
    console.debug("封面上传操作已触发");

    await sleep(1000);
    const buttons = document.querySelectorAll("button");
    const confirmButton = Array.from(buttons).find((button) => button.textContent?.trim() === "确认选择") as
      | HTMLElement
      | undefined;
    console.debug("doneButton -->", confirmButton);
    if (!confirmButton) return false;
    confirmButton.click();
    return true;
  }

  async function fillDescription(descriptionText: string): Promise<void> {
    const contentEditable = (await waitForElementOptional('div[contenteditable="true"]', 5000)) as HTMLElement | null;
    if (contentEditable) {
      contentEditable.click();
      await sleep(500);
      contentEditable.focus();
      contentEditable.textContent = "";
      contentEditable.innerHTML = "";
      contentEditable.dispatchEvent(new Event("input", { bubbles: true }));
      contentEditable.dispatchEvent(new Event("change", { bubbles: true }));
      await pasteText(contentEditable, `${descriptionText}\n`);
      await sleep(500);
      return;
    }

    const textarea = (await waitForElementOptional(
      'textarea[placeholder="填写视频简介，让更多人找到你的视频"]',
      5000,
    )) as HTMLTextAreaElement | null;
    if (!textarea) {
      console.log("未找到知乎视频简介输入框");
      return;
    }

    textarea.focus();
    textarea.value = descriptionText;
    textarea.dispatchEvent(new Event("input", { bubbles: true }));
    textarea.dispatchEvent(new Event("change", { bubbles: true }));
    textarea.blur();
  }

  async function addTags(tags: string[]): Promise<void> {
    if (tags.length === 0) return;

    let contentEditor: HTMLElement | null = null;
    contentEditor = (await waitForElementOptional('div[contenteditable="true"]', 5000)) as HTMLElement | null;
    if (!contentEditor) {
      console.debug("未找到话题编辑器");
      return;
    }

    for (const tag of tags.slice(0, 5)) {
      console.debug("添加标签", tag);
      contentEditor.focus();
      const pasteEvent = new ClipboardEvent("paste", {
        bubbles: true,
        cancelable: true,
        clipboardData: new DataTransfer(),
      });
      pasteEvent.clipboardData.setData("text/plain", `#${tag}`);
      contentEditor.dispatchEvent(pasteEvent);
      await sleep(1000);

      const activeSuggestion = document.querySelector("div.Menu-item.is-active") as HTMLElement | null;
      if (activeSuggestion) {
        const newTopic = activeSuggestion.querySelector("span.new-topic") as HTMLElement | null;
        if (newTopic?.textContent?.trim() === "创建新话题") {
          console.debug("创建新话题", tag);
          newTopic.click();
        } else {
          activeSuggestion.click();
        }
        await sleep(1000);
      }
    }

    contentEditor.blur();
  }

  async function publishIfAutoEnabled(videoUploaded: boolean): Promise<void> {
    if (data.isAutoPublish !== true) return;

    if (!videoUploaded) {
      console.warn("知乎自动发布已跳过：视频未成功触发上传");
      return;
    }

    await sleep(5000);
    const divs = document.querySelectorAll("div");
    const publishButton = Array.from(divs).find((div) => div.textContent?.trim() === "发布") as HTMLElement | undefined;
    if (publishButton) {
      console.debug("sendButton clicked");
      publishButton.click();
    } else {
      console.debug('未找到"发布"按钮');
    }
  }

  try {
    const { content, video, title, description, tags = [], cover } = data.data as VideoData;
    let videoUploaded = false;
    // 处理视频上传
    if (video) {
      const response = await fetch(video.url);
      const blob = await response.blob();
      const videoFile = new File([blob], video.name, { type: video.type });
      console.log(`视频文件: ${videoFile.name} ${videoFile.type} ${videoFile.size}`);

      videoUploaded = await uploadVideo(videoFile);
      if (videoUploaded) {
        console.log("视频上传已初始化");
      }
    } else {
      console.error("没有视频文件");
    }

    await sleep(5000);

    // 处理标题输入
    const titleInput = (await waitForElementOptional('input[placeholder="输入视频标题"]')) as HTMLInputElement | null;
    if (titleInput) {
      titleInput.value = title || content.slice(0, 20);
      titleInput.dispatchEvent(new Event("input", { bubbles: true }));
    } else {
      console.log("未找到知乎视频标题输入框");
    }

    // 填写内容
    await fillDescription(description || content);

    await addTags(tags).catch((error) => {
      console.warn("知乎标签处理失败，继续发布流程:", error);
    });

    if (cover) {
      await uploadCover(cover).catch((error) => {
        console.warn("知乎封面上传失败，继续发布流程:", error);
        return false;
      });
    }

    await publishIfAutoEnabled(videoUploaded);
  } catch (error) {
    console.error("知乎视频发布过程中出错:", error);
  }
}
