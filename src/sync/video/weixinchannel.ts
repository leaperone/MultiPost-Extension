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
    const { content, video, title, tags = [] } = data.data as VideoData;

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
    const titleInput = (await waitForElement(
      'input[placeholder="概括视频主要内容，字数建议6-16个字符"]',
    )) as HTMLInputElement;
    titleInput.value = title;
    titleInput.dispatchEvent(new Event('input', { bubbles: true }));

    // 处理内容和标签输入
    const descriptionInput = (await waitForElement('div[data-placeholder="添加描述"]')) as HTMLDivElement;

    if (descriptionInput) {
      // 输入主要内容
      descriptionInput.focus();
      const pasteEvent = new ClipboardEvent('paste', {
        bubbles: true,
        cancelable: true,
        clipboardData: new DataTransfer(),
      });
      pasteEvent.clipboardData.setData('text/plain', content || '');
      descriptionInput.dispatchEvent(pasteEvent);

      await new Promise((resolve) => setTimeout(resolve, 500));

      // 添加标签
      for (const tag of tags) {
        console.log('添加标签:', tag);
        descriptionInput.focus();

        const tagPasteEvent = new ClipboardEvent('paste', {
          bubbles: true,
          cancelable: true,
          clipboardData: new DataTransfer(),
        });
        tagPasteEvent.clipboardData.setData('text/plain', ` #${tag}`);
        descriptionInput.dispatchEvent(tagPasteEvent);

        await new Promise((resolve) => setTimeout(resolve, 1000));

        const enterEvent = new KeyboardEvent('keydown', {
          bubbles: true,
          cancelable: true,
          key: 'Enter',
          code: 'Enter',
          keyCode: 13,
          which: 13,
        });
        descriptionInput.dispatchEvent(enterEvent);

        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }

    // 处理原创声明
    const originalInput = (await waitForElement(
      'input[type="checkbox"][class="ant-checkbox-input"]',
    )) as HTMLInputElement;

    if (originalInput) {
      originalInput.click();
      await new Promise((resolve) => setTimeout(resolve, 1000));

      const declareInput = document.querySelector(
        'div.declare-body-wrapper input[type="checkbox"][class="ant-checkbox-input"]',
      ) as HTMLInputElement;

      if (declareInput) {
        declareInput.click();
        await new Promise((resolve) => setTimeout(resolve, 1000));

        const buttons = document.querySelectorAll('button[type="button"]');
        for (const button of Array.from(buttons)) {
          if (button.textContent === '声明原创') {
            console.log('点击声明原创按钮');
            (button as HTMLElement).click();
            await new Promise((resolve) => setTimeout(resolve, 1000));
            break;
          }
        }
      }
    }

    // 等待内容填写完成
    await new Promise((resolve) => setTimeout(resolve, 5000));

    // 处理发布按钮
    const buttons = document.querySelectorAll('button');
    const publishButton = Array.from(buttons).find((b) => b.textContent.trim() === '发表') as HTMLButtonElement;

    if (publishButton) {
      if (data.isAutoPublish) {
        console.log('点击发布按钮');
        publishButton.click();
      }
    } else {
      console.error('未找到"发表"按钮');
    }
  } catch (error) {
    console.error('WeiXinVideo 发布过程中出错:', error);
  }
}
