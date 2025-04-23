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
    await new Promise((resolve) => setTimeout(resolve, 1000)); // 等待1秒确保元素完全加载

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
    const { content, video, title, tags = [] } = data.data as VideoData;

    // 处理视频上传
    if (video) {
      const response = await fetch(video.url);
      const arrayBuffer = await response.arrayBuffer();
      const extension = video.name.split('.').pop();
      const fileName = `${title || 'video'}.${extension}`;
      const videoFile = new File([arrayBuffer], fileName, { type: video.type });
      console.log(`视频文件: ${videoFile.name} ${videoFile.type} ${videoFile.size}`);

      await uploadVideo(videoFile);
      console.log('视频上传已初始化');
    }

    await new Promise((resolve) => setTimeout(resolve, 5000));

    // 处理内容输入
    const editor = (await waitForElement('div.public-DraftEditor-content[contenteditable="true"]')) as HTMLDivElement;
    if (editor) {
      // 使用 ClipboardEvent 来模拟粘贴操作
      const fullContent = `${title || ''}
${content}
${tags.map((tag) => `#${tag}`).join(' ')}`;

      const pasteEvent = new ClipboardEvent('paste', {
        bubbles: true,
        cancelable: true,
        clipboardData: new DataTransfer(),
      });

      (pasteEvent.clipboardData as DataTransfer).setData('text/plain', fullContent);
      editor.dispatchEvent(pasteEvent);

      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    // 等待内容填写完成
    await new Promise((resolve) => setTimeout(resolve, 5000));

    // 处理发布按钮
    const buttons = document.querySelectorAll('button');
    for (const button of Array.from(buttons)) {
      if (['發佈', '发布', 'Post'].includes(button.textContent?.trim() || '')) {
        if (data.isAutoPublish) {
          console.log('点击发布按钮');
          button.click();
        }
        break;
      }
    }
  } catch (error) {
    console.error('TiktokVideo 发布过程中出错:', error);
    throw error; // 向上传递错误
  }
}
