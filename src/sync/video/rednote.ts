import type { SyncData, VideoData } from '../common';

export async function VideoRednote(data: SyncData) {
  const { content, video, title, tags, cover } = data.data as VideoData;

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

  // 辅助函数：上传封面
  async function uploadCover(coverFile: NonNullable<VideoData['cover']>) {
    // 1. 点击编辑封面触发器
    // 选择器参考了其他平台的实现，可能需要根据小红书的实际 DOM 结构进行调整
    const editCoverTrigger = document.querySelector('div.fake-upload-trigger') as HTMLElement;
    if (!editCoverTrigger) {
      console.error('未找到编辑封面触发器');
      return;
    }
    editCoverTrigger.click();
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // 2. 点击“本地上传”
    const localUploadLi = Array.from(document.querySelectorAll('li')).find(
      (li) => li.textContent?.includes('本地上传'),
    );
    if (!localUploadLi) {
      console.error('未找到“本地上传”按钮');
      return;
    }
    localUploadLi.click();
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // 3. 查找文件输入框并上传
    // 这里的选择器也可能需要适配小红书
    const fileInput = document.querySelector('div.xigua-upload-poster-trigger > input') as HTMLInputElement;
    if (!fileInput) {
      console.error('未找到封面上传的文件输入元素');
      return;
    }

    const dataTransfer = new DataTransfer();
    try {
      if (!coverFile.type.includes('image/')) {
        console.error('提供的封面文件不是图片');
        return;
      }
      const response = await fetch(coverFile.url);
      const blob = await response.blob();
      const file = new File([blob], coverFile.name, { type: coverFile.type });
      dataTransfer.items.add(file);
    } catch (error) {
      console.error(`上传封面 ${coverFile.url} 失败:`, error);
    }

    if (dataTransfer.files.length === 0) {
      return;
    }

    fileInput.files = dataTransfer.files;
    fileInput.dispatchEvent(new Event('change', { bubbles: true }));
    fileInput.dispatchEvent(new Event('input', { bubbles: true }));
    await new Promise((resolve) => setTimeout(resolve, 3000));

    // 4. 确认剪裁和选择
    const clipBtn = document.querySelector('div.clip-btn-content') as HTMLElement;
    if (clipBtn) {
      clipBtn.click();
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    const confirmButton = Array.from(document.querySelectorAll('button')).find((btn) => btn.textContent === '确定');
    if (confirmButton) {
      confirmButton.click();
      await new Promise((resolve) => setTimeout(resolve, 1000));
      const finalConfirm = document.querySelector('button.m-button.red') as HTMLElement;
      if (finalConfirm) {
        finalConfirm.click();
      }
    }
  }

  // 等待页面加载
  await waitForElement('span[class="title"]');
  await new Promise((resolve) => setTimeout(resolve, 1000));

  // 上传视频
  await uploadVideo();

  // 填写内容
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

  // 上传封面
  if (cover) {
    await uploadCover(cover);
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
