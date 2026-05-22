import type { DynamicData, SyncData } from "../common";

// 不支持发布视频
export async function DynamicBluesky(data: SyncData) {
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
    const { content, images, title } = data.data as DynamicData;

    await new Promise((resolve) => setTimeout(resolve, 3000));

    // 撰写按钮:优先 data-testid(最稳定),回退到多语言 aria-label 兜底
    const composeLabels = ["撰写新帖文", "新帖文", "撰寫新貼文", "Compose new post", "New post"];
    let newPostButton = document.querySelector('button[data-testid="composeFAB"]') as HTMLButtonElement | null;
    if (!newPostButton) {
      for (const label of composeLabels) {
        const btn = document.querySelector(`button[aria-label="${label}"]`) as HTMLButtonElement | null;
        if (btn) {
          newPostButton = btn;
          break;
        }
      }
    }
    if (newPostButton) {
      newPostButton.click();
    } else {
      console.log("未找到撰写新帖文按钮");
      return;
    }

    // 处理输入

    const contentInput = (await waitForElement('div[contenteditable="true"]')) as HTMLDivElement;
    contentInput.focus();
    contentInput.textContent = title ? `${title}\n${content}` : content;
    contentInput.dispatchEvent(new Event("input", { bubbles: true }));
    contentInput.dispatchEvent(new Event("change", { bubbles: true }));
    console.log("内容已输入:", content);

    if (images.length > 0) {
      const imageData = [];
      for (const file of images) {
        const response = await fetch(file.url);
        const blob = await response.blob();
        const imageFile = new File([blob], file.name, { type: file.type });
        console.log(`文件: ${imageFile.name} ${imageFile.type} ${imageFile.size}`);
        imageData.push(imageFile);
      }
      await new Promise((resolve) => setTimeout(resolve, 1000));

      window.postMessage({ type: "BLUESKY_IMAGE_UPLOAD", images: imageData }, "*");
    }

    // 发布动态
    if (data.isAutoPublish) {
      const maxAttempts = 3;
      for (let attempt = 0; attempt < maxAttempts; attempt++) {
        const publishButton = document.querySelector(
          'button[aria-label="Publish post"]:not(:disabled)',
        ) as HTMLButtonElement;
        if (publishButton) {
          publishButton.click();
          console.log("已点击发布按钮");
          await new Promise((resolve) => setTimeout(resolve, 3000));
          window.location.reload();
          return;
        }
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }
  } catch (error) {
    console.error("bluesky 发布过程中出错:", error);
  }
}
