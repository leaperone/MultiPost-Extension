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
  // Threads 的入口图标是 svg[aria-label],按 UI 语言不同走不同字符串
  function findCreateIcon(): HTMLElement | null {
    const labels = ["创建", "建立", "Create", "新貼文", "New post"];
    for (const label of labels) {
      const svg = document.querySelector(`svg[aria-label="${label}"]`);
      if (svg) return svg.closest("a, div, button") as HTMLElement | null;
    }
    return null;
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
      dialog.querySelector('div[aria-label="文本栏为空白。请输入内容，撰写新帖子。"]')) as HTMLElement;
    editor.click();
    if (!editor) {
      throw new Error("未找到编辑器元素");
    }
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

    if (images?.length > 0 || videos?.length > 0) {
      const fileInput = (await waitForElement(
        'input[type="file"][accept*="image/jpeg,image/png,image/webp,video/mp4,video/quicktime"]',
      )) as HTMLInputElement;

      if (!fileInput) {
        throw new Error("未找到文件输入元素");
      }

      const dataTransfer = new DataTransfer();

      // 处理图片
      if (images) {
        for (const image of images) {
          try {
            const response = await fetch(image.url);
            const blob = await response.blob();
            const file = new File([blob], image.name, { type: image.type });
            dataTransfer.items.add(file);
          } catch (error) {
            console.error("获取图片失败:", error);
          }
        }
      }

      // 处理视频
      if (videos && videos.length > 0) {
        try {
          const video = videos[0];
          const response = await fetch(video.url);
          const blob = await response.blob();
          const file = new File([blob], video.name, { type: video.type });
          dataTransfer.items.add(file);
        } catch (error) {
          console.error("获取视频失败:", error);
        }
      }

      fileInput.files = dataTransfer.files;
      const changeEvent = new Event("change", { bubbles: true });
      fileInput.dispatchEvent(changeEvent);
    }

    console.debug("成功填入Threads内容和图片");

    // 等待一段时间后尝试发布
    await new Promise((resolve) => setTimeout(resolve, 5000));
    if (data.isAutoPublish) {
      const publishDiv = Array.from(dialog.querySelectorAll("div")).find((el) => el.textContent.trim() === "发布");
      const nextDiv = publishDiv?.querySelector("div");
      console.log(nextDiv);
      nextDiv.click();
    }
  } catch (error) {
    console.error("填入Threads内容或上传图片时出错:", error);
  }
}
