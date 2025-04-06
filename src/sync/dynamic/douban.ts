import type { DynamicData, SyncData } from '../common';

// 优先发布图文
export async function DynamicDouban(data: SyncData) {
  const dynamicData = data.data as DynamicData;
  console.debug('DynamicDouban', data);

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

  // 填写内容
  async function fillContent() {
    await waitForElement('textarea[id="isay-cont"]');
    await new Promise((resolve) => setTimeout(resolve, 1000));

    const textarea = document.querySelector('#isay-cont') as HTMLTextAreaElement;
    if (textarea) {
      // 如果有标题，将标题和内容拼接
      const fullContent = dynamicData.title ? `${dynamicData.title}\n\n${dynamicData.content}` : dynamicData.content;
      textarea.value = fullContent;
      textarea.dispatchEvent(new Event('input', { bubbles: true }));
      textarea.dispatchEvent(new Event('click', { bubbles: true }));
    }
  }

  // 上传图片
  async function uploadFiles() {
    if (!dynamicData.images?.length) return;

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    if (!fileInput) {
      console.debug('未找到文件输入元素');
      return;
    }

    const dataTransfer = new DataTransfer();
    const files = dynamicData.images || [];

    for (let i = 0; i < files.length; i++) {
      if (i >= 8) {
        console.debug('最多上传8张图片');
        break;
      }

      const fileInfo = files[i];
      if (!fileInfo.type.startsWith('image/')) {
        console.debug('skip non-image file', fileInfo);
        continue;
      }

      try {
        console.debug('try upload file', fileInfo);
        const response = await fetch(fileInfo.url);
        const arrayBuffer = await response.arrayBuffer();
        const file = new File([arrayBuffer], fileInfo.name, { type: fileInfo.type });
        dataTransfer.items.add(file);
      } catch (error) {
        console.error('上传文件失败:', error);
      }
    }

    if (dataTransfer.files.length > 0) {
      fileInput.files = dataTransfer.files;
      fileInput.dispatchEvent(new Event('change', { bubbles: true }));
      fileInput.dispatchEvent(new Event('input', { bubbles: true }));
      console.debug('文件上传操作完成');
      await new Promise((resolve) => setTimeout(resolve, 5000));
    }
  }

  // 发布动态
  async function publishDynamic() {
    const sendButton = document.querySelector('#isay-submit') as HTMLButtonElement;
    if (sendButton) {
      if (data.isAutoPublish) {
        console.debug('sendButton clicked');
        sendButton.click();
      }
    } else {
      console.debug('未找到"发送"按钮');
    }
  }

  // 主流程
  try {
    await fillContent();
    await uploadFiles();
    await publishDynamic();
  } catch (error) {
    console.error('发布动态失败:', error);
  }
}
