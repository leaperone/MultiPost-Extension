import type { DynamicData, SyncData } from '../common';

export async function DynamicRednoteImage(data: SyncData) {
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

  // 等待页面加载
  await waitForElement('span[class="title"]');
  await new Promise((resolve) => setTimeout(resolve, 2000));

  // 上传图片
  const uploadButton = (await findElementByText('span[class="title"]', '上传图文')) as HTMLElement;
  if (uploadButton) {
    uploadButton.click();
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }

  // 上传文件
  await uploadFiles();

  // 填写标题
  const titleInput = (await waitForElement('input[class="el-input__inner"]')) as HTMLInputElement;
  if (titleInput) {
    titleInput.value = title || content.slice(0, 20);
    titleInput.dispatchEvent(new Event('input', { bubbles: true }));
  }

  // 填写内容
  const contentEditor = (await waitForElement('p.post-content')) as HTMLParagraphElement;
  if (contentEditor) {
    contentEditor.innerText = content;
    contentEditor.dispatchEvent(new Event('input', { bubbles: true }));
  }

  // 等待内容更新
  await new Promise((resolve) => setTimeout(resolve, 3000));

  await waitForElements('button[class="el-button publishBtn"]', images.length);

  // 发布按钮
  // const publishButton = (await findElementByText('button', '发布')) as HTMLButtonElement;
  // if (publishButton) {
  // publishButton.click();
  // await new Promise(resolve => setTimeout(resolve, 30000));
  // window.location.href = "https://creator.xiaohongshu.com/new/note-manager";
  // }

  if (data.auto_publish) {
    const maxAttempts = 3;
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        const publishButton = (await waitForElement('button[class="el-button publishBtn"]', 5000)) as HTMLButtonElement;
        publishButton.click();
        console.log('发布按钮已点击');
        await new Promise((resolve) => setTimeout(resolve, 3000));
        window.location.href = 'https://creator.xiaohongshu.com/new/note-manager';
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
