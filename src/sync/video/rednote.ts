import type { SyncData, VideoData } from '../common';

export async function VideoRednote(data: SyncData) {
  const { content, video, title, tags } = data.data as VideoData;

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

  // 辅助函数：上传文件
  async function uploadVideo() {
    const fileInput = (await waitForElement('input[type="file"]')) as HTMLInputElement;
    if (!fileInput) {
      console.error('未找到文件输入元素');
      return;
    }

    const dataTransfer = new DataTransfer();

    if (video) {
      try {
        const response = await fetch(video.url);
        if (!response.ok) {
          throw new Error(`HTTP 错误! 状态: ${response.status}`);
        }
        const blob = await response.blob();
        const file = new File([blob], video.name, { type: video.type });
        dataTransfer.items.add(file);
      } catch (error) {
        console.error(`上传视频 ${video.url} 失败:`, error);
      }
    }

    if (dataTransfer.files.length > 0) {
      fileInput.files = dataTransfer.files;
      fileInput.dispatchEvent(new Event('change', { bubbles: true }));
      fileInput.dispatchEvent(new Event('input', { bubbles: true }));
      await new Promise((resolve) => setTimeout(resolve, 2000)); // 等待文件处理
      console.log('文件上传操作完成');
    } else {
      console.error('没有成功添加任何文件');
    }
  }

  // 等待页面加载
  await waitForElement('span[class="title"]');
  await new Promise((resolve) => setTimeout(resolve, 1000));

  // 上传视频
  await uploadVideo();

  // 等待标题输入框出现
  await waitForElement('input[type="text"]');
  await new Promise((resolve) => setTimeout(resolve, 1000));

  // 填写标题
  const titleInput = document.querySelector('input[type="text"]') as HTMLInputElement;
  if (titleInput) {
    const finalTitle = title?.slice(0, 20) || content?.slice(0, 20) || '';
    titleInput.value = finalTitle;
    titleInput.dispatchEvent(new Event('input', { bubbles: true }));
  }

  // 填写内容和标签
  const editor = document.querySelector('div[contenteditable="true"]') as HTMLElement;
  if (!editor) {
    console.error('未找到编辑器元素');
    return;
  }

  // 填写正文内容
  editor.focus();
  const contentPasteEvent = new ClipboardEvent('paste', {
    bubbles: true,
    cancelable: true,
    clipboardData: new DataTransfer(),
  });
  contentPasteEvent.clipboardData.setData('text/plain', `${content}\n` || '');
  editor.dispatchEvent(contentPasteEvent);
  await new Promise((resolve) => setTimeout(resolve, 1000));
  editor.blur();

  // 添加标签
  if (tags && tags.length > 0) {
    for (const tag of tags) {
      editor.focus();
      const tagPasteEvent = new ClipboardEvent('paste', {
        bubbles: true,
        cancelable: true,
        clipboardData: new DataTransfer(),
      });
      tagPasteEvent.clipboardData.setData('text/plain', `#${tag}`);
      editor.dispatchEvent(tagPasteEvent);
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // 模拟回车键按下以确认标签
      const enterEvent = new KeyboardEvent('keydown', {
        bubbles: true,
        cancelable: true,
        key: 'Enter',
        code: 'Enter',
        keyCode: 13,
        which: 13,
      });
      editor.dispatchEvent(enterEvent);
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }
  }

  // 处理发布按钮
  const buttons = document.querySelectorAll('button');
  const publishButton = Array.from(buttons).find((button) => button.textContent?.includes('发布'));

  if (publishButton) {
    // 等待按钮可用
    while (publishButton.getAttribute('aria-disabled') === 'true') {
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    // 如果需要自动发布
    if (data.isAutoPublish) {
      publishButton.dispatchEvent(new Event('click', { bubbles: true }));
      await new Promise((resolve) => setTimeout(resolve, 10000));
      window.location.href = 'https://creator.xiaohongshu.com/new/note-manager';
    }
  } else {
    console.error('未找到"发布"按钮');
  }
}
