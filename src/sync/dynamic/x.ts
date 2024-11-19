import type { DynamicData, SyncData } from '../common';

export async function DynamicX(data: SyncData) {
  const { content, images, title } = data.data as DynamicData;
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

  // 辅助函数：等待多个元素出现
  function waitForElements(selector: string, count: number, timeout = 30000): Promise<Element[]> {
    return new Promise((resolve, reject) => {
      const checkElements = () => {
        const elements = document.querySelectorAll(selector);
        if (elements.length >= count) {
          resolve(Array.from(elements));
          return;
        }

        if (Date.now() - startTime > timeout) {
          reject(new Error(`未能在 ${timeout}ms 内找到 ${count} 个 "${selector}" 元素`));
          return;
        }

        setTimeout(checkElements, 100);
      };

      const startTime = Date.now();
      checkElements();
    });
  }

  // 拼接标题和内容
  const combinedText = `${title}\n${content}`;

  try {
    // 等待编辑器元素出现
    const editor = await waitForElement('div[data-contents="true"]');
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // 聚焦编辑器
    (editor as HTMLElement).focus();

    // 使用 ClipboardEvent 粘贴文本
    const pasteEvent = new ClipboardEvent('paste', {
      bubbles: true,
      cancelable: true,
      clipboardData: new DataTransfer(),
    });
    pasteEvent.clipboardData!.setData('text/plain', combinedText);
    editor.dispatchEvent(pasteEvent);

    // 处理图片上传
    if (images && images.length > 0) {
      const fileInput = (await waitForElement('input[type="file"]')) as HTMLInputElement;
      if (!fileInput) {
        console.error('未找到文件输入元素');
        return;
      }

      const dataTransfer = new DataTransfer();
      const uploadCount = Math.min(images.length, 4);
      for (let i = 0; i < uploadCount; i++) {
        const fileInfo = images[i];
        console.log('尝试上传文件', fileInfo.url);
        const response = await fetch(fileInfo.url);
        const blob = await response.blob();
        const file = new File([blob], fileInfo.name, { type: fileInfo.type });
        dataTransfer.items.add(file);
      }

      fileInput.files = dataTransfer.files;
      fileInput.dispatchEvent(new Event('change', { bubbles: true }));
      fileInput.dispatchEvent(new Event('input', { bubbles: true }));

      // 等待所有"Remove media"按钮出现，表示图片上传完成
      try {
        const removeButtons = await waitForElements('button[aria-label="Remove media"]', uploadCount, 30000);
        console.log(`成功上传 ${removeButtons.length} 张图片`);
      } catch (error) {
        console.error('图片上传可能未完成:', error);
      }
    }

    // 等待内容加载
    await new Promise((resolve) => setTimeout(resolve, 1000));

    if (data.auto_publish) {
      const maxAttempts = 3;
      for (let attempt = 0; attempt < maxAttempts; attempt++) {
        try {
          const publishButton = (await waitForElement(
            'button[data-testid="tweetButtonInline"]',
            5000,
          )) as HTMLButtonElement;
          publishButton.click();
          console.log('发布按钮已点击');
          await new Promise((resolve) => setTimeout(resolve, 3000));
          window.location.reload();
          break; // 成功点击后退出循环
        } catch (error) {
          console.warn(`第 ${attempt + 1} 次尝试查找发布按钮失败:`, error);
          if (attempt === maxAttempts - 1) {
            console.error('达到最大尝试次数，无法找到发布按钮');
          }
          await new Promise((resolve) => setTimeout(resolve, 2000)); // 等待2秒后重试
        }
      }
    }
  } catch (error) {
    console.error('X 发布过程中出错:', error);
  }
}
