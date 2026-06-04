import type { DynamicData, FileData, SyncData } from "../common";

interface OkjikeConfig {
  selectedTopic: string;
  historyTopics: string[];
}

// Prefer image posts.
export async function DynamicOkjike(data: SyncData) {
  const { title, content, images, tags } = data.data as DynamicData;
  const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

  // Wait for an element without throwing on timeout.
  function waitForElement(selector: string, timeout = 10000): Promise<Element | null> {
    return new Promise((resolve) => {
      const element = document.querySelector(selector);
      if (element) {
        resolve(element);
        return;
      }

      let timeoutId: ReturnType<typeof setTimeout> | undefined = undefined;
      const observer = new MutationObserver(() => {
        const element = document.querySelector(selector);
        if (element) {
          if (timeoutId) clearTimeout(timeoutId);
          observer.disconnect();
          resolve(element);
        }
      });

      observer.observe(document.body, {
        childList: true,
        subtree: true,
      });

      timeoutId = setTimeout(() => {
        observer.disconnect();
        console.warn(`Element with selector "${selector}" not found within ${timeout}ms`);
        resolve(null);
      }, timeout);
    });
  }

  function getUploadingStatus() {
    return Array.from(document.querySelectorAll('div[role="status"]')).find((element) =>
      element.textContent?.includes("正在上传"),
    );
  }

  async function waitForImageUploadToFinish(timeout = 60000, interval = 500): Promise<boolean> {
    const deadline = Date.now() + timeout;
    const firstCheckDeadline = Date.now() + 3000;
    let sawUploading = false;

    while (Date.now() < deadline) {
      const uploadingStatus = getUploadingStatus();
      console.debug("Jike uploading status:", uploadingStatus);
      if (uploadingStatus) {
        sawUploading = true;
        await sleep(interval);
        continue;
      }

      if (sawUploading || Date.now() >= firstCheckDeadline) {
        return true;
      }

      await sleep(250);
    }

    return !getUploadingStatus();
  }

  function getUploadRoot(editor: HTMLElement): HTMLElement {
    const uploadRoot = editor.closest("form") || editor.closest('[role="dialog"]');
    if (uploadRoot instanceof HTMLElement) return uploadRoot;

    return editor.parentElement?.parentElement || editor.parentElement || editor;
  }

  function countAttachedImagePreviews(editor: HTMLElement) {
    const root = getUploadRoot(editor);
    const previewImages = Array.from(root.querySelectorAll<HTMLImageElement>("img")).filter((image) =>
      Boolean(image.currentSrc || image.getAttribute("src")),
    );

    return new Set(previewImages).size;
  }

  async function createImageFiles(fileInfos: FileData[]) {
    const imageFiles: File[] = [];
    const limitedFileInfos = fileInfos.slice(0, 9);

    if (fileInfos.length > limitedFileInfos.length) {
      console.debug("Jike supports up to 9 images; skipping extra images");
    }

    for (const fileInfo of limitedFileInfos) {
      try {
        const response = await fetch(fileInfo.url);
        if (!response.ok) {
          console.error(`Failed to fetch image "${fileInfo.name}": ${response.status} ${response.statusText}`);
          continue;
        }

        const blob = await response.blob();
        const fileType = fileInfo.type || blob.type;
        imageFiles.push(new File([blob], fileInfo.name, { type: fileType }));
      } catch (error) {
        console.error("Failed to prepare Jike image:", error);
      }
    }

    return imageFiles;
  }

  async function uploadFilesByPaste(editor: HTMLElement, files: File[]) {
    if (files.length === 0) return 0;

    const attachedBefore = countAttachedImagePreviews(editor);
    const dataTransfer = new DataTransfer();
    for (const file of files) {
      dataTransfer.items.add(file);
    }

    try {
      editor.focus();
      const imagePasteEvent = new ClipboardEvent("paste", {
        bubbles: true,
        cancelable: true,
        clipboardData: dataTransfer,
      });
      editor.dispatchEvent(imagePasteEvent);
    } catch (error) {
      console.error("Jike paste-based image upload failed:", error);
      return 0;
    }

    const uploadFinished = await waitForImageUploadToFinish();
    if (!uploadFinished) {
      console.error("Jike image upload did not finish before timeout");
      return 0;
    }

    const attachedAfter = countAttachedImagePreviews(editor);
    const attachedCount = Math.max(0, attachedAfter - attachedBefore);
    if (attachedCount > 0) {
      return Math.min(attachedCount, files.length);
    }

    console.debug("No Jike paste upload evidence detected; trying file input fallback");
    return 0;
  }

  async function uploadFilesByInput(editor: HTMLElement, files: File[]) {
    if (files.length === 0) return 0;

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement | null;
    if (!fileInput) {
      console.error("media requested but upload input not found");
      return 0;
    }

    const attachedBefore = countAttachedImagePreviews(editor);
    const dataTransfer = new DataTransfer();
    for (const file of files) {
      dataTransfer.items.add(file);
    }

    try {
      fileInput.files = dataTransfer.files;
      fileInput.dispatchEvent(new Event("change", { bubbles: true }));
      fileInput.dispatchEvent(new Event("input", { bubbles: true }));
    } catch (error) {
      console.error("Jike file input image upload fallback failed:", error);
      return 0;
    }

    const uploadFinished = await waitForImageUploadToFinish();
    if (!uploadFinished) {
      console.error("Jike image upload did not finish before timeout");
      return 0;
    }

    const attachedAfter = countAttachedImagePreviews(editor);
    const attachedCount = Math.max(0, attachedAfter - attachedBefore);
    if (attachedCount > 0) {
      return Math.min(attachedCount, files.length);
    }

    console.error("media requested but no attached image was detected");
    return 0;
  }

  // Handle topic selection.
  async function handleTopicSelection(topic: string) {
    const topicInput = (await waitForElement('input[placeholder="未选择圈子"]')) as HTMLInputElement;
    if (!topicInput) {
      console.error("未找到话题输入框");
      return;
    }

    // Click the input to show the topic menu.
    topicInput.click();

    topicInput.value = topic;
    topicInput.dispatchEvent(new Event("change", { bubbles: true }));
    topicInput.dispatchEvent(new Event("input", { bubbles: true }));

    // Wait for the topic menu to appear.
    await sleep(2000);

    // Search for topics inside the platform topic container.
    const topicContainer = document.querySelector('div[name="topic"]');
    if (!topicContainer) {
      console.error("未找到话题容器");
      return;
    }

    // Find all clickable topic items.
    const topicElements = Array.from(topicContainer.querySelectorAll('div[tabindex="0"]'));

    // Prefer the configured topic.
    let topicItem = topicElements.find((element) => element.textContent?.trim() === topic.trim());

    // Fall back to the first available topic.
    if (!topicItem && topicElements.length > 0) {
      console.log("未找到指定话题，选择第一个可用话题");
      topicItem = topicElements[0];
    }

    console.log("选择的话题元素:", topicItem);

    if (topicItem) {
      (topicItem as HTMLElement).click();
    } else {
      console.error("没有找到任何可用的话题");
    }
  }

  async function fillContent() {
    const inputElement = (await waitForElement('div[contenteditable="true"][role="textbox"]')) as HTMLDivElement | null;
    if (!inputElement) {
      console.error("Jike editor not found");
      return null;
    }

    const tagSuffix = tags?.length ? ` ${tags.map((t) => `#${t}`).join(" ")}` : "";
    const fullContent = `${title}\n${content}${tagSuffix}`;
    const pasteEvent = new ClipboardEvent("paste", {
      bubbles: true,
      cancelable: true,
      clipboardData: new DataTransfer(),
    });
    pasteEvent.clipboardData.setData("text/plain", fullContent);
    inputElement.focus();
    inputElement.dispatchEvent(pasteEvent);
    return inputElement;
  }

  async function uploadFiles(editor: HTMLElement) {
    const files = await createImageFiles(images || []);
    if (files.length === 0) return 0;

    const pastedCount = await uploadFilesByPaste(editor, files);
    if (pastedCount > 0) return pastedCount;

    return await uploadFilesByInput(editor, files);
  }

  try {
    const editor = await fillContent();
    if (!editor) return;

    const requestedImageCount = Math.min(images?.length ?? 0, 9);
    let attachedImageCount = 0;

    if (images && images.length > 0) {
      attachedImageCount = await uploadFiles(editor);
    }

    const platform = data.platforms.find((p) => p.name === "DYNAMIC_OKJIKE");
    const selectedTopic = (platform?.extraConfig as OkjikeConfig)?.selectedTopic || "";
    if (selectedTopic) {
      await handleTopicSelection(selectedTopic);
    }

    if (data.isAutoPublish) {
      if (requestedImageCount > 0 && attachedImageCount !== requestedImageCount) {
        console.error(
          `only ${attachedImageCount} of ${requestedImageCount} requested images attached; skipping auto-publish to avoid an incomplete post`,
        );
        return;
      }

      if (requestedImageCount > 0) {
        const uploadFinished = await waitForImageUploadToFinish();
        if (!uploadFinished) {
          console.error("Jike image upload did not finish before auto-publish");
          return;
        }
      }

      const buttons = document.querySelectorAll("button");
      const publishButton = Array.from(buttons).find((button) =>
        button.textContent?.includes("发送"),
      ) as HTMLButtonElement;

      if (publishButton) {
        let attempts = 0;
        while (publishButton.disabled && attempts < 10) {
          await sleep(3000);
          attempts++;
          console.log(`等待发布按钮可用... 尝试 ${attempts}/10`);
        }

        if (publishButton.disabled) {
          console.error("发布按钮在10次尝试后仍被禁用");
          return;
        }

        console.log("点击发布按钮");
        publishButton.click();
      }
    }
  } catch (error) {
    console.error("发布过程中出错:", error);
  }
}
