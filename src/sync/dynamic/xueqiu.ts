import type { DynamicData, SyncData } from '../common';

export async function DynamicXueqiu(data: SyncData) {
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

  async function uploadFiles(files: File[]) {
    const fileInput = (await waitForElement('input[type="file"]')) as HTMLInputElement;
    if (!fileInput) {
      console.error('未找到文件输入元素');
      return;
    }

    const dataTransfer = new DataTransfer();
    for (const file of files) {
      dataTransfer.items.add(file);
    }

    fileInput.files = dataTransfer.files;
    fileInput.dispatchEvent(new Event('change', { bubbles: true }));
    fileInput.dispatchEvent(new Event('input', { bubbles: true }));
    await new Promise((resolve) => setTimeout(resolve, 2000));
    console.debug('文件上传操作完成');
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

  try {
    // 等待并点击占位元素
    const placeholder = (await waitForElement('div[class="fake-placeholder"]')) as HTMLElement;
    placeholder.click();
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // 修改填写内容的部分
    const inputElement = (await waitForElement(
      'div[class="medium-editor-element"][contenteditable="true"]',
    )) as HTMLDivElement;
    const fullContent = `${title}\n${content}`;

    // 使用粘贴事件输入内容
    const pasteEvent = new ClipboardEvent('paste', {
      bubbles: true,
      cancelable: true,
      clipboardData: new DataTransfer(),
    });
    pasteEvent.clipboardData.setData('text/plain', fullContent);
    inputElement.focus();
    inputElement.dispatchEvent(pasteEvent);

    console.debug('成功填入雪球内容');

    // 处理图片上传
    if (images && images.length > 0) {
      const imageFiles = await Promise.all(
        images.map(async (file) => {
          const response = await fetch(file.url);
          const blob = await response.blob();
          return new File([blob], file.name, { type: file.type });
        }),
      );
      const currentUploaded = document.querySelectorAll('.img-single-upload');
      await uploadFiles(imageFiles);
      await waitForElements('.img-single-upload', images.length + currentUploaded.length);
    }

    console.debug('成功填入雪球内容和图片');

    // 等待一段时间后尝试发布
    await new Promise((resolve) => setTimeout(resolve, 5000));

    if (data.auto_publish) {
      const maxAttempts = 3;
      for (let attempt = 0; attempt < maxAttempts; attempt++) {
        try {
          const sendButton = await waitForElement('a[class="lite-editor__submit"]', 5000) as HTMLElement;
          sendButton.click();
          console.log('发送按钮已点击');
          await new Promise((resolve) => setTimeout(resolve, 3000));
          window.location.reload();
          break; // 成功点击后退出循环
        } catch (error) {
          console.warn(`第 ${attempt + 1} 次尝试查找发送按钮失败:`, error);
          if (attempt === maxAttempts - 1) {
            console.error('达到最大尝试次数，无法找到发送按钮');
          }
          await new Promise((resolve) => setTimeout(resolve, 2000)); // 等待2秒后重试
        }
      }
    }
  } catch (error) {
    console.error('填入雪球内容或上传图片时出错:', error);
  }
}
