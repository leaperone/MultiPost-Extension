import type { SyncData, VideoData } from '../common';

export async function VideoWeiXinChannel(data: SyncData) {
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
    const fileInput = (await waitForElement(
      'input[type="file"][accept="video/mp4,video/x-m4v,video/*"]',
    )) as HTMLInputElement;

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
    const editorElement = (await waitForElement('div.input-editor')) as HTMLDivElement;
    if (editorElement) {
      editorElement.focus();
      const pasteEvent = new ClipboardEvent('paste', {
        bubbles: true,
        cancelable: true,
        clipboardData: new DataTransfer(),
      });
      pasteEvent.clipboardData.setData('text/plain', content || '');
      editorElement.dispatchEvent(pasteEvent);
      editorElement.dispatchEvent(new Event('input', { bubbles: true }));
      editorElement.dispatchEvent(new Event('change', { bubbles: true }));
      console.log('编辑器内容已更新');
    }

    const titleInput = (await waitForElement(
      'input[placeholder="概括视频主要内容，字数建议6-16个字符"]',
    )) as HTMLTextAreaElement;
    titleInput.value = title;
    titleInput.dispatchEvent(new Event('input', { bubbles: true }));

    // 等待内容填写完成
    await new Promise((resolve) => setTimeout(resolve, 5000));

    // 处理发布按钮
    const publishButton = [...document.querySelectorAll('button')].find(
      (b) => b.textContent.trim() === '发表',
    ) as HTMLButtonElement;

    if (publishButton && data.isAutoPublish) {
      console.log('点击发布按钮');
      publishButton.click();
    }
  } catch (error) {
    console.error('WeiXinVideo 发布过程中出错:', error);
  }
}
