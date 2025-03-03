import type { DynamicData, SyncData } from '../common';

// 优先发布图文
export async function DynamicDouyin(data: SyncData) {
  const { title, content, images } = data.data as DynamicData;
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

  // 辅助函数：通过文本内容查找元素
  async function findElementByText(
    selector: string,
    text: string,
    maxRetries = 5,
    retryInterval = 1000,
  ): Promise<Element | null> {
    for (let i = 0; i < maxRetries; i++) {
      const elements = document.querySelectorAll(selector);
      const element = Array.from(elements).find((element) => element.textContent?.includes(text));

      if (element) {
        return element;
      }

      console.log(`未找到包含文本 "${text}" 的元素，尝试次数：${i + 1}`);
      await new Promise((resolve) => setTimeout(resolve, retryInterval));
    }

    console.error(`在 ${maxRetries} 次尝试后未找到包含文本 "${text}" 的元素`);
    return null;
  }

  async function checkImagesUploaded(expectedCount: number, maxRetries = 10, retryInterval = 3000): Promise<boolean> {
    for (let i = 0; i < maxRetries; i++) {
      const viewTexts = document.querySelectorAll('span:contains("查看")');
      const imageCount = viewTexts.length;

      console.log(`当前找到 ${imageCount} 个 "查看" 文本，期望数量：${expectedCount}`);

      if (imageCount === expectedCount) {
        console.log('图片上传完成');
        return true;
      }

      console.log(`图片上传未完成，等待中...（尝试次数：${i + 1}）`);
      await new Promise((resolve) => setTimeout(resolve, retryInterval));
    }

    console.error(`在 ${maxRetries} 次尝试后，图片上传仍未完成`);
    return true;
  }

  // 辅助函数：上传文件
  async function uploadImages() {
    const fileInput = (await waitForElement(
      'input[accept="image/png,image/jpeg,image/jpg,image/bmp,image/webp,image/tif"][multiple][type="file"]',
    )) as HTMLInputElement;
    if (!fileInput) {
      console.error('未找到文件输入元素');
      return;
    }

    const dataTransfer = new DataTransfer();

    for (const fileInfo of images) {
      try {
        const response = await fetch(fileInfo.url);
        if (!response.ok) {
          throw new Error(`HTTP 错误! 状态: ${response.status}`);
        }
        const blob = await response.blob();
        const file = new File([blob], fileInfo.name, { type: fileInfo.type });
        dataTransfer.items.add(file);
      } catch (error) {
        console.error(`上传图片 ${fileInfo.url} 失败:`, error);
      }
    }

    if (dataTransfer.files.length > 0) {
      fileInput.files = dataTransfer.files;
      fileInput.dispatchEvent(new Event('change', { bubbles: true }));
      await new Promise((resolve) => setTimeout(resolve, 2000)); // 等待文件处理
      console.log('文件上传操作完成');
    } else {
      console.error('没有成功添加任何文件');
    }
  }

  await new Promise((resolve) => setTimeout(resolve, 2000));

  if (images && images.length > 0) {
    // 上传文件
    await uploadImages();

    //   填写标题
    const titleInput = (await waitForElement('input[placeholder="添加作品标题"]')) as HTMLInputElement;
    if (titleInput) {
      titleInput.value = title || content.slice(0, 20);
      titleInput.dispatchEvent(new Event('input', { bubbles: true }));
    }

    // 填写内容
    const contentEditor = (await waitForElement('div[data-line-wrapper="true"]')) as HTMLDivElement;
    if (contentEditor) {
      // 创建一个新的 ClipboardEvent
      const pasteEvent = new ClipboardEvent('paste', {
        bubbles: true,
        cancelable: true,
        clipboardData: new DataTransfer(),
      });

      // 设置剪贴板数据
      pasteEvent.clipboardData.setData('text/plain', content);

      // 触发粘贴事件
      contentEditor.dispatchEvent(pasteEvent);
    }

    //   // 等待内容更新
    await new Promise((resolve) => setTimeout(resolve, 3000));

    await checkImagesUploaded(images.length);

    if (data.auto_publish) {
      const maxAttempts = 3;
      for (let attempt = 0; attempt < maxAttempts; attempt++) {
        try {
          const publishButton = (await findElementByText('button', '发布', 5, 1000)) as HTMLButtonElement;
          if (publishButton) {
            publishButton.click();
            console.log('发布按钮已点击');
            await new Promise((resolve) => setTimeout(resolve, 3000));
            window.location.href = 'https://creator.douyin.com/creator-micro/content/manage';
            break; // 成功点击后退出循环
          } else {
            throw new Error('未找到发布按钮');
          }
        } catch (error) {
          console.warn(`第 ${attempt + 1} 次尝试查找发布按钮失败:`, error);
          if (attempt === maxAttempts - 1) {
            console.error('达到最大尝试次数，无法找到发布按钮');
          }
          await new Promise((resolve) => setTimeout(resolve, 2000)); // 等待2秒后重试
        }
      }
    }
  }
}
