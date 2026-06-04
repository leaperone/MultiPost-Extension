import type { DynamicData, SyncData } from "../common";

// 只支持图文，不支持视频
export async function DynamicThreads(data: SyncData) {
  const { title, content, images, videos, tags } = data.data as DynamicData;

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

  // Threads 的入口图标是 svg[aria-label],按 UI 语言不同走不同字符串
  function findCreateIcon(): HTMLElement | null {
    const labels = ["创建", "建立", "Create", "新貼文", "New post"];
    for (const label of labels) {
      const svg = document.querySelector(`svg[aria-label="${label}"]`);
      if (svg) return svg.closest("a, div, button") as HTMLElement | null;
    }
    return null;
  }

  async function findMediaFileInput(): Promise<HTMLInputElement | null> {
    const selectors = [
      'input[type="file"][accept="image/avif,image/jpeg,image/png,image/webp,video/mp4,video/quicktime,video/webm"]',
      'input[type="file"][accept*="image/jpeg"][accept*="video/mp4"]',
      'input[type="file"][accept*="image/"][accept*="video/"]',
    ];
    for (const selector of selectors) {
      const input = document.querySelector(selector) as HTMLInputElement | null;
      if (input) return input;
    }
    for (const selector of selectors) {
      const input = (await waitForElementOptional(selector, 3000)) as HTMLInputElement | null;
      if (input) return input;
    }
    return null;
  }

  function findPublishElement(root: ParentNode): HTMLElement | null {
    const publishDiv = Array.from(root.querySelectorAll("div")).find((el) => el.textContent?.trim() === "发布") as
      | HTMLElement
      | undefined;
    const nestedPublishDiv = publishDiv?.querySelector("div") as HTMLElement | null;
    if (nestedPublishDiv) return nestedPublishDiv;
    if (publishDiv) return publishDiv;

    const publishLabels = ["Post", "发布", "發佈"];
    return (
      Array.from(root.querySelectorAll<HTMLElement>('button, div[role="button"], [aria-label]')).find((el) => {
        const ariaLabel = el.getAttribute("aria-label")?.trim();
        const text = el.textContent?.trim();
        return publishLabels.includes(ariaLabel || "") || publishLabels.includes(text || "");
      }) || null
    );
  }

  function dispatchPublishShortcut(target: HTMLElement) {
    const isMac = /Mac|macOS|iPhone|iPod|iPad/.test(navigator.userAgent);
    target.focus();
    target.dispatchEvent(
      new KeyboardEvent("keydown", {
        bubbles: true,
        cancelable: true,
        key: "Enter",
        code: "Enter",
        metaKey: isMac,
        ctrlKey: !isMac,
        composed: true,
      }),
    );
  }

  try {
    // 等待并点击占位元素(可能是占位帖编辑区,也可能是顶部 Create 图标)
    const composeIcon = findCreateIcon();
    if (composeIcon) {
      composeIcon.click();
      await new Promise((resolve) => setTimeout(resolve, 2000));
    } else {
      const placeholder = (await waitForElement(
        'div[aria-label="文本栏为空白。请输入内容，撰写新帖子。"], div[contenteditable="true"][aria-placeholder]',
      )) as HTMLElement;
      placeholder.click();
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }
    const dialog = document.querySelector("div[role='dialog']") || document.body;
    // 查找并填写帖子内容,优先用 contenteditable 通用选择器,再回退到旧的中文 aria-label
    const editor = (dialog.querySelector('div[contenteditable="true"][aria-placeholder]') ||
      dialog.querySelector('div[contenteditable="true"]') ||
      dialog.querySelector('div[aria-label="文本栏为空白。请输入内容，撰写新帖子。"]')) as HTMLElement | null;
    if (!editor) {
      console.error("未找到编辑器元素");
      return;
    }
    editor.click();
    editor.focus();
    const pasteEvent = new ClipboardEvent("paste", {
      bubbles: true,
      cancelable: true,
      clipboardData: new DataTransfer(),
    });
    const tagSuffix = tags?.length ? ` ${tags.map((t) => `#${t}`).join(" ")}` : "";
    pasteEvent.clipboardData.setData("text/plain", `${title ? `${title}\n` : ""}${content || ""}${tagSuffix}`);
    editor.dispatchEvent(pasteEvent);

    console.debug("成功填入Threads内容");

    const requestedMediaCount = (images?.length ?? 0) + (videos?.length ?? 0);
    const mediaFiles = [...(images || []), ...(videos?.[0] ? [videos[0]] : [])].slice(0, 20);
    let attachedMediaCount = 0;
    if (mediaFiles.length > 0) {
      const fileInput = await findMediaFileInput();

      if (!fileInput) {
        console.error("media requested but upload input not found");
      } else {
        const dataTransfer = new DataTransfer();
        for (const media of mediaFiles) {
          try {
            const response = await fetch(media.url);
            if (!response.ok) {
              throw new Error(`Failed to fetch media "${media.name}": ${response.status} ${response.statusText}`);
            }
            const blob = await response.blob();
            const file = new File([blob], media.name, { type: media.type });
            dataTransfer.items.add(file);
          } catch (error) {
            console.error("获取媒体文件失败:", error);
          }
        }

        if (dataTransfer.files.length === 0) {
          console.error("media requested but upload could not be performed");
        } else {
          try {
            fileInput.files = dataTransfer.files;
            const changeEvent = new Event("change", { bubbles: true });
            fileInput.dispatchEvent(changeEvent);
            fileInput.dispatchEvent(new Event("input", { bubbles: true }));
            attachedMediaCount = dataTransfer.files.length;
          } catch (error) {
            console.error("media upload could not be performed:", error);
          }
        }
      }
    }

    console.debug("成功填入Threads内容和图片");

    // Wait briefly before trying to publish.
    await new Promise((resolve) => setTimeout(resolve, 5000));
    if (data.isAutoPublish && requestedMediaCount > 0 && attachedMediaCount !== requestedMediaCount) {
      console.error(
        `only ${attachedMediaCount} of ${requestedMediaCount} requested media attached; skipping auto-publish to avoid an incomplete post`,
      );
      return;
    }
    if (data.isAutoPublish) {
      const publishElement = findPublishElement(dialog);
      if (publishElement) {
        publishElement.click();
      } else {
        dispatchPublishShortcut(editor);
        console.log("已触发 Threads 发布快捷键");
      }
    }
  } catch (error) {
    console.error("填入Threads内容或上传图片时出错:", error);
  }
}
