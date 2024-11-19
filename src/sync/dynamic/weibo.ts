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

  // 辅助函数：通过文本内容查找元素
  //   async function findElementByText(
  //     selector: string,
  //     text: string,
  //     maxRetries = 5,
  //     retryInterval = 1000,
  //   ): Promise<Element | null> {
  //     for (let i = 0; i < maxRetries; i++) {
  //       const elements = document.querySelectorAll(selector);
  //       const element = Array.from(elements).find((element) => element.textContent?.includes(text));

  //       if (element) {
  //         return element;
  //       }

  //       console.log(`未找到包含文本 "${text}" 的元素，尝试次数：${i + 1}`);
  //       await new Promise((resolve) => setTimeout(resolve, retryInterval));
  //     }

  //     console.error(`在 ${maxRetries} 次尝试后未找到包含文本 "${text}" 的元素`);
  //     return null;
  //   }

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
    }

    console.log('成功填入微博内容和图片');

    // 处理自动发布
    if (data.auto_publish) {
      const sendButtons = document.querySelectorAll("span.woo-button-content");
      const sendButton = Array.from(sendButtons).find((button) =>
        button.textContent?.includes("发送")
      );

      if (sendButton) {
        console.log("点击发送按钮");
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
