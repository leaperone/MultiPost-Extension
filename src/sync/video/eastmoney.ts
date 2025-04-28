import { type SyncData, type VideoData } from '../common';

export async function VideoEastmoney(data: SyncData) {
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

  async function uploadVideo(file: File): Promise<void> {
    const fileInput = (await waitForElement('input[id="uploadVideo"]')) as HTMLInputElement;

    // 创建一个新的 File 对象，因为某些浏览器可能不允许直接设置 fileInput.files
    const dataTransfer = new DataTransfer();
    dataTransfer.items.add(file);
    fileInput.files = dataTransfer.files;

    // 触发 change 事件
    const changeEvent = new Event('change', { bubbles: true });
    fileInput.dispatchEvent(changeEvent);

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
    } else {
      console.error('没有视频文件');
      return;
    }

    await new Promise((resolve) => setTimeout(resolve, 5000));

    const contentToInsert = title ? `${title}\n${content}` : content;

    // 等待简介编辑器出现并输入内容
    const editor = (await waitForElement('textarea[id="videoArtTitle"]')) as HTMLDivElement;
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // 直接设置文本内容
    editor.textContent = contentToInsert;

    // 触发 input 事件
    const pasteEvent = new ClipboardEvent('paste', {
      bubbles: true,
      cancelable: true,
      clipboardData: new DataTransfer(),
    });
    pasteEvent.clipboardData.setData('text/plain', contentToInsert);
    editor.dispatchEvent(pasteEvent);

    // 处理标签
    await new Promise((resolve) => setTimeout(resolve, 5000));

    // 如果需要自动发布
    if (data.isAutoPublish) {
      const submitButtonSpan = await findElementByText('span', '发布');
      if (submitButtonSpan) {
        console.log('点击发布按钮');
        submitButtonSpan.parentElement?.click();
      } else {
        console.log('未找到"发布"按钮');
      }
    }
  } catch (error) {
    console.error('EastmoneyVideo 发布过程中出错:', error);
  }
}
