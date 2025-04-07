import type { DynamicData, SyncData } from '../common';

// 优先发布图文
export async function DynamicDedao(data: SyncData) {
  const dynamicData = data.data as DynamicData;
  console.debug('DynamicDedao', data);

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
    await waitForElement('div#richEditor');
    await new Promise((resolve) => setTimeout(resolve, 1000));

    const editor = document.querySelector('div#richEditor') as HTMLDivElement;
    if (editor) {
      // 清空编辑器内容
      editor.innerHTML = '';
      editor.focus();

      // 如果有标题，将标题和内容拼接
      const fullContent = dynamicData.title ? `${dynamicData.title}\n\n${dynamicData.content}` : dynamicData.content;

      // 使用 ClipboardEvent 来粘贴内容
      const clipboardEvent = new ClipboardEvent('paste', {
        bubbles: true,
        cancelable: true,
        clipboardData: new DataTransfer(),
      });
      clipboardEvent.clipboardData?.setData('text/plain', fullContent || '');
      editor.dispatchEvent(clipboardEvent);
    } else {
      console.debug('未找到编辑器元素');
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
      if (i >= 9) {
        // 得到最多支持9张图片
        console.debug('最多上传9张图片');
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
        console.debug('uploaded');
      } catch (error) {
        console.error('上传文件失败:', error);
      }
    }

    if (dataTransfer.files.length > 0) {
      fileInput.files = dataTransfer.files;
      fileInput.dispatchEvent(new Event('change', { bubbles: true }));
      fileInput.dispatchEvent(new Event('input', { bubbles: true }));
      console.debug('文件上传操作完成');
    }
  }

  // 发布动态
  async function publishDynamic() {
    const sendButtons = document.querySelectorAll('span.submit');
    const sendButton = Array.from(sendButtons).find((button) => button.textContent?.includes('发布'));

    if (sendButton) {
      if (data.isAutoPublish) {
        // 等待图片上传完成
        await new Promise((resolve) => setTimeout(resolve, 3000));
        let retryCount = 0;
        while (retryCount++ < 30) {
          const loadingText = document.querySelector('.pc-file__list-item__loading-text');
          if (!loadingText) break;
          console.debug(`等待图片上传完成，尝试 ${retryCount}/30`);
          await new Promise((resolve) => setTimeout(resolve, 1000));
        }

        console.debug('sendButton clicked');
        sendButton.dispatchEvent(new Event('click', { bubbles: true }));
      }
    } else {
      console.debug('未找到"发布"按钮');
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
