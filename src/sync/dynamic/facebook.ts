import type { SyncData, DynamicData } from '../common';

// 允许发布图文和视频
export async function DynamicFacebook(data: SyncData) {
  console.log('Facebook 函数被调用');

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

  try {
    const { title, content, images, videos } = data.data as DynamicData;

    // 等待页面加载完成
    await waitForElement('body');
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // 查找创建帖子按钮
    const createPostButton =
      document.querySelector('div[aria-label="创建帖子"]') ||
      document.querySelector('div[aria-label="Create a post"]') ||
      document.querySelector('div[aria-label="建立貼文"]');

    if (!createPostButton) {
      console.debug('未找到创建帖子按钮');
      return;
    }

    // 查找并点击照片/视频按钮
    const spans = createPostButton.querySelectorAll('span');
    const photoButton = Array.from(spans).find(
      (span) =>
        span.textContent?.includes('照片/视频') ||
        span.textContent?.includes('Photo/video') ||
        span.textContent?.includes('相片／影片'),
    );

    if (!photoButton) {
      console.error('未找到照片/视频按钮');
      return;
    }
    photoButton.click();

    await new Promise((resolve) => setTimeout(resolve, 1000));

    // 查找并填写帖子内容
    const editors = document.querySelectorAll(
      'div[contenteditable="true"][role="textbox"][spellcheck="true"][tabindex="0"][data-lexical-editor="true"]',
    );
    const editor = Array.from(editors).find((el) => {
      const placeholder = el.getAttribute('aria-placeholder');
      return (
        placeholder?.includes('在想些什么') ||
        placeholder?.includes("What's on your mind") ||
        placeholder?.includes('分享你的新鲜事吧')
      );
    }) as HTMLElement;

    if (!editor) {
      console.debug('未找到编辑器元素');
      return;
    }

    // 填写内容
    editor.focus();
    const pasteEvent = new ClipboardEvent('paste', {
      bubbles: true,
      cancelable: true,
      clipboardData: new DataTransfer(),
    });
    pasteEvent.clipboardData.setData('text/plain', `${title}\n${content}` || '');
    editor.dispatchEvent(pasteEvent);

    // 上传图片
    if (images && images.length > 0) {
      const fileInput = document.querySelector(
        'input[type="file"][accept="image/*,image/heif,image/heic,video/*,video/mp4,video/x-m4v,video/x-matroska,.mkv"]',
      ) as HTMLInputElement;
      if (!fileInput) {
        console.debug('未找到文件输入元素');
        return;
      }

      const dataTransfer = new DataTransfer();
      for (const image of images) {
        console.debug('尝试上传文件', image);
        try {
          const response = await fetch(image.url);
          const blob = await response.blob();
          const file = new File([blob], image.name, { type: image.type });
          dataTransfer.items.add(file);
        } catch (error) {
          console.error('获取文件失败:', error);
        }
      }

      if (videos && videos.length > 0) {
        const video = videos[0];
        const response = await fetch(video.url);
        const blob = await response.blob();
        const file = new File([blob], video.name, { type: video.type });
        dataTransfer.items.add(file);
      }

      fileInput.files = dataTransfer.files;
      fileInput.dispatchEvent(new Event('change', { bubbles: true }));
      fileInput.dispatchEvent(new Event('input', { bubbles: true }));
      console.debug('文件上传操作完成');
    }

    // 等待上传完成后查找发布按钮
    await new Promise((resolve) => setTimeout(resolve, 3000));

    if (data.auto_publish) {
      const maxAttempts = 3;
      for (let attempt = 0; attempt < maxAttempts; attempt++) {
        const postButton =
          document.querySelector('div[aria-label="发帖"]') ||
          document.querySelector('div[aria-label="Post"]') ||
          document.querySelector('div[aria-label="發佈"]');

        if (postButton) {
          (postButton as HTMLElement).click();
          console.log('已点击发布按钮');
          await new Promise((resolve) => setTimeout(resolve, 3000));
          window.location.reload();
          return;
        }
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
      console.error('发布按钮点击失败：超过最大重试次数');
    }
  } catch (error) {
    console.error('FacebookDynamic 发布过程中出错:', error);
  }
}
