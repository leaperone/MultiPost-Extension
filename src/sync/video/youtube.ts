import type { SyncData, VideoData } from '../common';

export async function VideoYoutube(data: SyncData) {
  function waitForElement(selector: string, timeout = 10000): Promise<Element | null> {
    return new Promise((resolve) => {
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
        console.warn(`Element with selector "${selector}" not found within ${timeout}ms`);
        resolve(null);
      }, timeout);
    });
  }

  async function uploadCover(cover: { url: string; name: string; type?: string }) {
    console.debug('Trying to upload cover', cover);

    const coverInput = (await waitForElement('input#file-loader.ytcp-thumbnail-uploader', 5000)) as HTMLInputElement;

    if (!coverInput) {
      console.error('Could not find the thumbnail uploader input.');
      return;
    }

    if (!cover.type || !cover.type.includes('image/')) {
      console.error('Cover file is not an image or type is missing.');
      return;
    }

    const response = await fetch(cover.url);
    const arrayBuffer = await response.arrayBuffer();
    const coverFile = new File([arrayBuffer], cover.name, { type: cover.type });

    const dataTransfer = new DataTransfer();
    dataTransfer.items.add(coverFile);

    if (dataTransfer.files.length === 0) {
      return;
    }

    coverInput.files = dataTransfer.files;
    coverInput.dispatchEvent(new Event('change', { bubbles: true }));
    coverInput.dispatchEvent(new Event('input', { bubbles: true }));
    console.debug('Cover file upload events dispatched.');
  }
  try {
    const videoData = data.data as VideoData;

    if (videoData.tags && videoData.tags.length > 0) {
      videoData.title = `${videoData.title} ${videoData.tags.map((tag) => `#${tag}`).join(' ')}`;
    }

    // 等待上传按钮出现并点击
    const uploadIcon = await waitForElement('ytcp-icon-button#upload-icon');
    if (!uploadIcon) {
      console.error('未找到上传按钮');
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
    (uploadIcon as HTMLElement).click();
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // 处理视频上传
    if (!videoData.video) {
      console.error('没有视频文件');
      return;
    }

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    console.debug('fileInput', fileInput);

    if (!fileInput) {
      console.error('未找到文件输入框');
      return;
    }

    const response = await fetch(videoData.video.url);
    const arrayBuffer = await response.arrayBuffer();
    const extension = videoData.video.name.split('.').pop();
    const fileName = `${videoData.title}.${extension}`;
    const videoFile = new File([arrayBuffer], fileName, { type: videoData.video.type });

    const dataTransfer = new DataTransfer();
    dataTransfer.items.add(videoFile);
    fileInput.files = dataTransfer.files;

    fileInput.dispatchEvent(new Event('change', { bubbles: true }));
    fileInput.dispatchEvent(new Event('input', { bubbles: true }));
    console.debug('文件上传操作完成');

    // 等待标题输入框出现
    const titleArea = await waitForElement('#title-textarea');
    if (!titleArea) {
      console.error('未找到 title-textarea');
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 3000));

    // 处理标题输入
    console.debug('titleArea', titleArea);

    const titleInput = titleArea.querySelector('#textbox') as HTMLElement;
    console.debug('titleInput', titleInput);

    if (!titleInput) {
      console.error('未找到 titleInput');
      return;
    }

    // 清空并设置标题
    titleInput.innerHTML = '';
    await new Promise((resolve) => setTimeout(resolve, 1000));
    titleInput.focus();

    const titlePasteEvent = new ClipboardEvent('paste', {
      bubbles: true,
      cancelable: true,
      clipboardData: new DataTransfer(),
    });
    titlePasteEvent.clipboardData!.setData('text/plain', videoData.title || '');
    titleInput.dispatchEvent(titlePasteEvent);
    await new Promise((resolve) => setTimeout(resolve, 1000));
    titleInput.blur();

    // 处理描述输入
    const descriptionArea = document.querySelector('#description-textarea');
    if (descriptionArea) {
      const descriptionInput = descriptionArea.querySelector('#textbox') as HTMLElement;
      console.debug('descriptionInput', descriptionInput);

      if (descriptionInput) {
        descriptionInput.focus();
        const descPasteEvent = new ClipboardEvent('paste', {
          bubbles: true,
          cancelable: true,
          clipboardData: new DataTransfer(),
        });
        descPasteEvent.clipboardData!.setData('text/plain', videoData.content || '');
        descriptionInput.dispatchEvent(descPasteEvent);
        await new Promise((resolve) => setTimeout(resolve, 1000));
        descriptionInput.blur();
      }
    }

    if (videoData.cover) {
      await uploadCover(videoData.cover);
    }

    await new Promise((resolve) => setTimeout(resolve, 1000));

    // 自动发布逻辑
    const buttons = document.querySelectorAll('button');
    const publishButton = Array.from(buttons).find((button) => button.textContent === '发布');

    if (publishButton) {
      if (data.isAutoPublish) {
        console.debug('sendButton clicked');
        (publishButton as HTMLElement).click();
      }
    } else {
      console.debug("未找到'发布'按钮");
    }
  } catch (error) {
    console.error('YoutubeVideo 发布过程中出错:', error);
  }
}
