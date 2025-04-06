import type { SyncData, VideoData } from '../common';

export async function VideoTiktok(data: SyncData) {
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

  async function uploadVideo(file: File): Promise<void> {
    const fileInput = (await waitForElement('input[type="file"][accept="video/*"]')) as HTMLInputElement;

    const dataTransfer = new DataTransfer();
    dataTransfer.items.add(file);
    fileInput.files = dataTransfer.files;

    // 触发必要的事件
    const changeEvent = new Event('change', { bubbles: true });
    fileInput.dispatchEvent(changeEvent);
    const inputEvent = new Event('input', { bubbles: true });
    fileInput.dispatchEvent(inputEvent);

    console.log('视频上传事件已触发');
  }

  try {
    const { content, video, title } = data.data as VideoData;

    // 处理视频上传
    if (video) {
      const response = await fetch(video.url);
      const blob = await response.blob();
      const videoFile = new File([blob], video.name, { type: video.type });
      console.log(`视频文件: ${videoFile.name} ${videoFile.type} ${videoFile.size}`);

      await uploadVideo(videoFile);
      console.log('视频上传已初始化');
    }

    await new Promise((resolve) => setTimeout(resolve, 5000));

    // 处理内容输入
    const editor = (await waitForElement('div.public-DraftEditor-content[contenteditable="true"]')) as HTMLDivElement;
    if (editor) {
      const contentDiv = editor.querySelector('div[data-contents="true"]');
      if (contentDiv) {
        contentDiv.innerHTML = `${title || ''}
${content}`;
      }
    }

    // 等待内容填写完成
    await new Promise((resolve) => setTimeout(resolve, 5000));

    // 处理发布按钮
    const publishButton = document.querySelector(
      'button.TUXButton.TUXButton--default.TUXButton--large.TUXButton--primary',
    ) as HTMLButtonElement;

    if (publishButton && data.isAutoPublish) {
      console.log('点击发布按钮');
      publishButton.click();
    }
  } catch (error) {
    console.error('TiktokVideo 发布过程中出错:', error);
  }
}
