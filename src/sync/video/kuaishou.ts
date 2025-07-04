import type { SyncData, VideoData } from '../common';

export async function VideoKuaishou(data: SyncData) {
  const { content, video, title, tags = [], cover } = data.data as VideoData;

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

  // 辅助函数：上传视频
  async function uploadVideo() {
    const fileInput = (await waitForElement(
      'input[type=file][accept="video/*,.mp4,.mov,.flv,.f4v,.webm,.mkv,.rm,.rmvb,.m4v,.3gp,.3g2,.wmv,.avi,.asf,.mpg,.mpeg,.ts"]',
    )) as HTMLInputElement;
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
  async function uploadCover() {
    if (!cover) return;

    const coverSettingsSpan = Array.from(document.querySelectorAll('span')).find(
      (el) => el.textContent?.includes('封面设置'),
    );

    if (!coverSettingsSpan) {
      console.error('未找到 "封面设置" 按钮');
      return;
    }

    const coverUploadButton = coverSettingsSpan.parentElement?.nextElementSibling?.firstChild
      ?.firstChild as HTMLElement;
    if (!coverUploadButton) {
      console.error('未找到封面上传区域');
      return;
    }

    coverUploadButton.click();

    try {
      await waitForElement('div.ant-modal-body');
    } catch (error) {
      console.error('封面设置弹窗未出现', error);
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 3000));

    while (true) {
      const loadingSpan = Array.from(document.querySelectorAll('div.ant-modal-body span')).find(
        (el) => el.textContent === '加载中',
      );
      if (loadingSpan) {
        await new Promise((resolve) => setTimeout(resolve, 3000));
      } else {
        break;
      }
    }

    const uploadCoverDiv = Array.from(document.querySelectorAll('div.ant-modal-body div')).find(
      (el) => el.textContent === '上传封面',
    );

    if (!uploadCoverDiv) {
      console.error('未找到 "上传封面" 按钮');
      return;
    }
    (uploadCoverDiv as HTMLElement).click();

    const fileInput = (await waitForElement("div.ant-modal-body input[type='file']")) as HTMLInputElement;
    if (!fileInput) {
      console.error('未找到封面上传的 file input');
      return;
    }

    const dataTransfer = new DataTransfer();
    if (cover.url && cover.type.includes('image/')) {
      try {
        const response = await fetch(cover.url);
        if (!response.ok) {
          throw new Error(`HTTP 错误! 状态: ${response.status}`);
        }
        const buffer = await response.arrayBuffer();
        const file = new File([buffer], cover.name, { type: cover.type });
        dataTransfer.items.add(file);
      } catch (error) {
        console.error(`上传封面 ${cover.url} 失败:`, error);
      }
    }

    if (dataTransfer.files.length === 0) {
      console.error('没有要上传的封面文件');
      return;
    }

    fileInput.files = dataTransfer.files;
    fileInput.dispatchEvent(new Event('change', { bubbles: true }));
    fileInput.dispatchEvent(new Event('input', { bubbles: true }));

    await new Promise((resolve) => setTimeout(resolve, 3000));

    const confirmButton = Array.from(document.querySelectorAll('button')).find(
      (el) => el.textContent?.trim() === '确认',
    ) as HTMLElement;

    if (confirmButton) {
      confirmButton.click();
    } else {
      console.error("未找到'确认'按钮");
    }
  }

  // 等待页面加载
  await waitForElement('div#rc-tabs-0-tab-2');
  await new Promise((resolve) => setTimeout(resolve, 2000));

  // 上传视频
  await uploadVideo();

  // 填写内容
  const contentEditor = (await waitForElement('div#work-description-edit[contenteditable="true"]')) as HTMLDivElement;
  if (contentEditor) {
    // 组合标题、内容和标签
    const formattedContent = `${title || ''}\n${content}\n${tags.map((tag) => `#${tag}`).join(' ')}`;

    // 使用 ClipboardEvent 来粘贴内容
    contentEditor.focus();
    const pasteEvent = new ClipboardEvent('paste', {
      bubbles: true,
      cancelable: true,
      clipboardData: new DataTransfer(),
    });
    pasteEvent.clipboardData?.setData('text/plain', formattedContent);
    contentEditor.dispatchEvent(pasteEvent);
    await new Promise((resolve) => setTimeout(resolve, 1000));
    contentEditor.blur();
  }

  // 上传封面
  if (cover) {
    await uploadCover();
  }

  // 等待内容更新
  await new Promise((resolve) => setTimeout(resolve, 5000));

  // 发布按钮逻辑
  if (data.isAutoPublish) {
    const divElements = document.querySelectorAll('div');
    const publishButton = Array.from(divElements).find((el) => el.textContent === '发布') as HTMLElement;

    if (publishButton) {
      console.log('找到发布按钮，准备点击');
      publishButton.click();
      await new Promise((resolve) => setTimeout(resolve, 3000));
      window.location.href = 'https://cp.kuaishou.com/article/manage/video';
    } else {
      console.error('未找到"发布"按钮');
    }
  }
}
