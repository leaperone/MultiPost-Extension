import type { DynamicData, SyncData } from '../common';

export async function DynamicWeibo(data: SyncData) {
  const { content, images, title } = data.data as DynamicData;

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

  // 辅助函数：等待所有图片上传完成
  function waitForUploadsToComplete(timeout = 60000): Promise<void> {
    return new Promise((resolve, reject) => {
      const startTime = Date.now();

      const checkStatus = () => {
        // 查找所有表示正在加载的元素
        const loadingElements = document.querySelectorAll('.Image_loading_1lfUB');

        // 如果没有正在加载的元素，说明上传完成
        if (loadingElements.length === 0) {
          console.log('所有图片上传已完成。');
          resolve();
          return;
        }

        // 检查是否超时
        if (Date.now() - startTime > timeout) {
          reject(new Error(`图片上传在 ${timeout}ms 内未完成。`));
          return;
        }

        // 稍后重试
        setTimeout(checkStatus, 500);
      };

      // `waitForElements` 返回后，加载动画可能还未渲染出来，延迟一下首次检查
      setTimeout(checkStatus, 100);
    });
  }

  // 辅助函数：上传文件
  async function uploadFiles() {
    const fileInput = (await waitForElement('input[type="file"]')) as HTMLInputElement;
    if (!fileInput) {
      console.error('未找到文件输入元素');
      return;
    }

    const dataTransfer = new DataTransfer();

    for (const file of images) {
      const response = await fetch(file.url);
      const blob = await response.blob();
      const imageFile = new File([blob], file.name, { type: file.type });
      console.log(`文件: ${imageFile.name} ${imageFile.type} ${imageFile.size}`);
      dataTransfer.items.add(imageFile);
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

  try {
    // 使用 findElementByText 函数查找输入元素
    const inputElement = (await waitForElement(
      'textarea[placeholder="有什么新鲜事想分享给大家？"]',
    )) as HTMLTextAreaElement;

    if (!inputElement) {
      throw new Error('未找到微博输入框');
    }

    // 组合标题和内容
    const fullContent = `${title}\n${content}`;

    // 填写内容
    inputElement.value = fullContent;
    inputElement.dispatchEvent(new Event('input', { bubbles: true }));

    console.log('成功填入微博内容');

    // 处理图片上传
    if (images && images.length > 0) {
      await uploadFiles();
      await waitForElements('i[title="删除"]', images.length);
      await waitForUploadsToComplete();
    }

    console.log('成功填入微博内容和图片');

    // 处理自动发布
    if (data.isAutoPublish) {
      const sendButtons = document.querySelectorAll('span.woo-button-content');
      const sendButton = Array.from(sendButtons).find((button) => button.textContent?.includes('发送'));

      if (sendButton) {
        console.log('点击发送按钮');
        await new Promise((resolve) => setTimeout(resolve, 10000));
        (sendButton as HTMLElement).click();
        await new Promise((resolve) => setTimeout(resolve, 3000));
        window.location.reload();
      } else {
        console.log("未找到'发送'按钮");
      }
    }
  } catch (error) {
    console.error('填入微博内容或上传图片时出错:', error);
  }
}
