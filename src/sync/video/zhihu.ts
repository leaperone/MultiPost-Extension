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

  async function uploadVideo(file: File): Promise<void> {
    const fileInput = (await waitForElement("input[type=file]")) as HTMLInputElement;

    // 创建一个新的 File 对象，因为某些浏览器可能不允许直接设置 fileInput.files
    const dataTransfer = new DataTransfer();
    dataTransfer.items.add(file);
    fileInput.files = dataTransfer.files;

    // 触发 change 事件
    const changeEvent = new Event("change", { bubbles: true });
    fileInput.dispatchEvent(changeEvent);

    console.log("视频上传事件已触发");
  }

  async function uploadCover(cover: NonNullable<VideoData["cover"]>): Promise<void> {
    console.debug("tryCover", cover);
    const coverButton = (await waitForElement("div.VideoUploadForm-imageEditButton")) as HTMLElement;
    console.debug("coverButton -->", coverButton);
    if (!coverButton) return;

    coverButton.click();
    await waitForElement("h3.Modal-title");

    const uploadTabs = document.querySelectorAll("h3.Modal-title div");
    const localUploadTab = Array.from(uploadTabs).find((tab) => tab.textContent?.trim() === "本地上传") as
      | HTMLElement
      | undefined;
    console.debug("localUploadDiv -->", localUploadTab);
    if (!localUploadTab) return;

    localUploadTab.click();
    const fileInput = (await waitForElement(
      "input[type='file'][accept='image/png,image/jpeg,image/jpg']",
    )) as HTMLInputElement;
    console.debug("fileInput -->", fileInput);
    if (!fileInput || !cover.type?.includes("image/")) return;

    const response = await fetch(cover.url);
    const arrayBuffer = await response.arrayBuffer();
    const coverFile = new File([arrayBuffer], cover.name, { type: cover.type });
    const dataTransfer = new DataTransfer();
    dataTransfer.items.add(coverFile);
    fileInput.files = dataTransfer.files;
    fileInput.dispatchEvent(new Event("change", { bubbles: true }));
    fileInput.dispatchEvent(new Event("input", { bubbles: true }));
    console.debug("封面上传操作已触发");

    await new Promise((resolve) => setTimeout(resolve, 1000));
    const buttons = document.querySelectorAll("button");
    const confirmButton = Array.from(buttons).find((button) => button.textContent?.trim() === "确认选择") as
      | HTMLElement
      | undefined;
    console.debug("doneButton -->", confirmButton);
    confirmButton?.click();
  }

  async function addTags(tags: string[]): Promise<void> {
    if (tags.length === 0) return;

    let contentEditor: HTMLElement | null = null;
    try {
      contentEditor = (await waitForElement('div[contenteditable="true"]', 5000)) as HTMLElement;
    } catch (error) {
      console.debug("未找到话题编辑器", error);
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
      await new Promise((resolve) => setTimeout(resolve, 1000));

      const activeSuggestion = document.querySelector("div.Menu-item.is-active") as HTMLElement | null;
      if (activeSuggestion) {
        const newTopic = activeSuggestion.querySelector("span.new-topic") as HTMLElement | null;
        if (newTopic?.textContent?.trim() === "创建新话题") {
          console.debug("创建新话题", tag);
          newTopic.click();
        } else {
          activeSuggestion.click();
        }
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }

    contentEditor.blur();
  }

  async function publishIfAutoEnabled(): Promise<void> {
    if (data.isAutoPublish !== true) return;

    await new Promise((resolve) => setTimeout(resolve, 5000));
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
    // 处理视频上传
    if (video) {
      const response = await fetch(video.url);
      const blob = await response.blob();
      const videoFile = new File([blob], video.name, { type: video.type });
      console.log(`视频文件: ${videoFile.name} ${videoFile.type} ${videoFile.size}`);

      await uploadVideo(videoFile);
      console.log("视频上传已初始化");
    }

    await new Promise((resolve) => setTimeout(resolve, 5000));

    // 处理标题输入
    const titleInput = (await waitForElement('input[placeholder="输入视频标题"]')) as HTMLInputElement;
    if (titleInput) {
      titleInput.value = title || content.slice(0, 20);
      titleInput.dispatchEvent(new Event("input", { bubbles: true }));
    }

    // 填写内容
    const contentEditor = (await waitForElement(
      'textarea[placeholder="填写视频简介，让更多人找到你的视频"]',
    )) as HTMLTextAreaElement;
    if (contentEditor) {
      // 直接设置文本内容(优先使用 description 字段,回退到 content)
      contentEditor.value = description || content;

      // 触发必要的事件以确保内容更新被识别
      contentEditor.dispatchEvent(new Event("input", { bubbles: true }));
      contentEditor.dispatchEvent(new Event("change", { bubbles: true }));

      // 模拟用户输入
      contentEditor.focus();
      contentEditor.blur();
    }

    await addTags(tags);

    if (cover) {
      // 封面为尽力而为：上传失败(如封面 UI 变更/超时)不应阻断后续发布
      try {
        await uploadCover(cover);
      } catch (coverError) {
        console.warn("知乎封面上传失败，跳过封面继续发布:", coverError);
      }
    }

    await publishIfAutoEnabled();
  } catch (error) {
    console.error("知乎视频发布过程中出错:", error);
  }
}
