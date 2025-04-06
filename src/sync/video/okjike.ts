import type { SyncData, VideoData } from '../common';

export async function VideoOkjike(data: SyncData) {
  const { title, content, video } = data.data as VideoData;

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
    const textarea = (await waitForElement('textarea[placeholder="分享你的想法..."]')) as HTMLTextAreaElement;
    if (textarea) {
      // 如果有标题，将标题和内容拼接
      const fullContent = title ? `${title}\n\n${content}` : content;
      textarea.value = fullContent;
      textarea.dispatchEvent(new Event('input', { bubbles: true }));
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }

  // 上传视频文件
  async function uploadVideo() {
    if (!video) {
      console.error('没有视频文件');
      return;
    }

    const fileInput = document.querySelector('input[type="file"][accept="video/mp4"]') as HTMLInputElement;
    if (!fileInput) {
      console.error('未找到文件输入元素');
      return;
    }

    const dataTransfer = new DataTransfer();

    try {
      const response = await fetch(video.url);
      if (!response.ok) throw new Error(`HTTP 错误! 状态: ${response.status}`);

      const blob = await response.blob();
      const file = new File([blob], video.name, { type: video.type });
      dataTransfer.items.add(file);
    } catch (error) {
      console.error(`上传视频失败:`, error);
      return;
    }

    if (dataTransfer.files.length > 0) {
      fileInput.files = dataTransfer.files;
      fileInput.dispatchEvent(new Event('change', { bubbles: true }));
      fileInput.dispatchEvent(new Event('input', { bubbles: true }));
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }
  }

  // 主流程
  try {
    await fillContent();
    await uploadVideo();

    if (data.isAutoPublish) {
      await new Promise((resolve) => setTimeout(resolve, 3000));
      const buttons = document.querySelectorAll('button');
      const publishButton = Array.from(buttons).find(
        (button) => button.textContent?.includes('发布'),
      ) as HTMLButtonElement;

      if (publishButton) {
        let attempts = 0;
        while (publishButton.disabled && attempts < 10) {
          await new Promise((resolve) => setTimeout(resolve, 3000));
          attempts++;
          console.log(`等待发布按钮可用... 尝试 ${attempts}/10`);
        }

        if (publishButton.disabled) {
          console.error('发布按钮在10次尝试后仍被禁用');
          return;
        }

        console.log('点击发布按钮');
        publishButton.click();
      }
    }
  } catch (error) {
    console.error('发布过程中出错:', error);
  }
}
