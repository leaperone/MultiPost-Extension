import type { SyncData, VideoData } from '../common';

export async function VideoDouyin(data: SyncData) {
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
    const fileInput = (await waitForElement('input[type=file]')) as HTMLInputElement;

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
    }

    await new Promise((resolve) => setTimeout(resolve, 5000));

    // 处理标题输入
    const titleInput = (await waitForElement('input[placeholder*="作品标题"]')) as HTMLInputElement;
    if (titleInput) {
      titleInput.value = title || content.slice(0, 20);
      titleInput.dispatchEvent(new Event('input', { bubbles: true }));
    }

    // 填写内容
    const contentEditor = (await waitForElement('div[data-line-wrapper="true"]')) as HTMLDivElement;
    if (contentEditor) {
      // 创建一个新的 ClipboardEvent
      const pasteEvent = new ClipboardEvent('paste', {
        bubbles: true,
        cancelable: true,
        clipboardData: new DataTransfer(),
      });

      // 设置剪贴板数据
      pasteEvent.clipboardData.setData('text/plain', content);

      // 触发粘贴事件
      contentEditor.dispatchEvent(pasteEvent);
    }

    // 如果需要保留换行符，可以使用 innerHTML
    // editor.innerHTML = contentToInsert.replace(/\n/g, '<br>');

    // 如果需要自动发布，可以添加类似的逻辑
    // if (data.isAutoPublish) {
    //   // 自动发布逻辑
    // }
  } catch (error) {
    console.error('DouyinVideo 发布过程中出错:', error);
  }
}
