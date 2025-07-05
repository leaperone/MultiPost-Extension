import type { SyncData, VideoData } from '../common';

export async function VideoTiktok(data: SyncData) {
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
        resolve(null);
      }, timeout);
    });
  }

  async function uploadVideo(file: File): Promise<void> {
    const fileInput = (await waitForElement('input[type="file"][accept="video/*"]')) as HTMLInputElement;
    if (!fileInput) {
      console.error('Video file input not found');
      throw new Error('Video file input not found');
    }
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

  async function uploadCover(cover: { url: string; name: string; type: string }) {
    console.log('准备上传封面:', cover);

    const editContainer = (await waitForElement('div.edit-container')) as HTMLElement;
    if (!editContainer) {
      console.log('未找到封面编辑容器');
      return;
    }
    editContainer.click();
    await new Promise((r) => setTimeout(r, 1000));

    const tabs = document.querySelectorAll('div.cover-edit-header div.cover-edit-tab');
    if (tabs.length < 2) {
      console.log('未找到封面上传标签页');
      return;
    }
    (tabs[1] as HTMLElement).click();
    await new Promise((r) => setTimeout(r, 1000));

    const fileInput = (await waitForElement(
      'input[type="file"][accept="image/png, image/jpeg, image/jpg"]',
    )) as HTMLInputElement;
    if (!fileInput) {
      console.log('未找到封面图片文件输入框');
      return;
    }

    const response = await fetch(cover.url);
    const buffer = await response.arrayBuffer();
    const imageFile = new File([buffer], cover.name, { type: cover.type });

    const dataTransfer = new DataTransfer();
    dataTransfer.items.add(imageFile);
    fileInput.files = dataTransfer.files;

    fileInput.dispatchEvent(new Event('change', { bubbles: true }));
    fileInput.dispatchEvent(new Event('input', { bubbles: true }));

    console.log('封面图片上传事件已触发');
    await new Promise((r) => setTimeout(r, 3000));

    const doneButtons = document.querySelectorAll('div.cover-edit-footer button');
    console.log('完成按钮:', doneButtons);
    const doneButton = doneButtons[doneButtons.length - 1] as HTMLElement;
    if (doneButton) {
      doneButton.click();
      console.log('已点击完成按钮');
    }
  }

  try {
    const {
      content,
      video,
      title,
      tags = [],
      cover,
    } = data.data as VideoData & { cover?: { url: string; name: string; type: string } };

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

    if (cover) {
      await uploadCover(cover);
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
