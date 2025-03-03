import type { DynamicData, SyncData } from '../common';

// 优先发布图文
export async function DynamicKuaishou(data: SyncData) {
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

  // 辅助函数：上传文件
  async function uploadImages() {
    const fileInput = (await waitForElement(
      'input[type="file"][accept="image/png, image/jpg, image/jpeg, image/webp"]',
    )) as HTMLInputElement;
    if (!fileInput) {
      console.error('未找到文件输入元素');
      return;
    }

    const dataTransfer = new DataTransfer();

    console.log('开始上传图片');
    for (const fileInfo of images) {
      console.log(`准备上传图片: ${fileInfo.url}`);
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
      const uploadButton = (await findElementByText('button', '上传图片')) as HTMLElement;

      // 使用 simulateDragAndDrop 函数模拟拖拽事件
      simulateDragAndDrop(uploadButton.parentElement.parentElement, dataTransfer);
      console.log('文件上传操作完成');
    } else {
      console.error('没有成功添加任何文件');
    }
  }

  // 模拟拖拽事件的函数
  function simulateDragAndDrop(element: HTMLElement, dataTransfer: DataTransfer) {
    console.log('simulateDragAndDrop', dataTransfer);
    const events = [
      new DragEvent('dragenter', { bubbles: true }),
      new DragEvent('dragover', { bubbles: true }),
      new DragEvent('drop', { bubbles: true, dataTransfer: dataTransfer }),
    ];
    events.forEach((event) => {
      Object.defineProperty(event, 'preventDefault', { value: () => {} });
    });
    events.forEach((event) => {
      console.log('event', event);
      element.dispatchEvent(event);
    });
  }

  if (images && images.length > 0) {
    console.log('检测到图片，开始上传');

    const imageTab = (await waitForElement('div#rc-tabs-0-tab-2')) as HTMLElement;
    imageTab.click();
    await new Promise((resolve) => setTimeout(resolve, 2000));
    await uploadImages();

    await new Promise((resolve) => setTimeout(resolve, 5000));

    // 处理作品描述
    const contentEditor = (await waitForElement('div#work-description-edit[contenteditable="true"]')) as HTMLDivElement;
    if (contentEditor) {
      contentEditor.innerText = `${title || ''}\n\n${content}`;
      contentEditor.dispatchEvent(new Event('input', { bubbles: true }));
    }

    // 等待内容更新
    await new Promise((resolve) => setTimeout(resolve, 3000));

    if (data.auto_publish) {
      console.log('开始自动发布');
      const maxAttempts = 3;
      for (let attempt = 0; attempt < maxAttempts; attempt++) {
        try {
          const publishButton = (await findElementByText('div', '发布')) as HTMLElement;
          publishButton.click();
          console.log('发布按钮已点击');
          await new Promise((resolve) => setTimeout(resolve, 3000));
          window.location.href = 'https://cp.kuaishou.com/article/manage/video';
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
  }
}
