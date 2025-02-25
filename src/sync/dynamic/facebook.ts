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

    // 查找创建帖子按钮并触发点击事件
    const createPostButton =
      document.querySelector('div[aria-label="创建帖子"]') ||
      document.querySelector('div[aria-label="Create a post"]') ||
      document.querySelector('div[aria-label="建立貼文"]');

    if (!createPostButton) {
      throw new Error('未找到创建帖子按钮');
    }

    // 使用原生事件触发点击
    createPostButton.dispatchEvent(new Event('click', { bubbles: true }));
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // 查找并点击照片/视频按钮
    const spans = document.querySelectorAll('span');
    const photoButton = Array.from(spans).find(
      (span) =>
        span.textContent?.includes('照片/视频') ||
        span.textContent?.includes('Photo/video') ||
        span.textContent?.includes('相片／影片'),
    );

    if (!photoButton) {
      throw new Error('未找到照片/视频按钮');
    }
    photoButton.dispatchEvent(new Event('click', { bubbles: true }));

    await new Promise((resolve) => setTimeout(resolve, 1500));

    // 查找并填写帖子内容
    const editor = (await waitForElement(
      'div[contenteditable="true"][role="textbox"][spellcheck="true"][tabindex="0"][data-lexical-editor="true"]',
    )) as HTMLElement;

    if (!editor) {
      throw new Error('未找到编辑器元素');
    }

    // 填写内容
    editor.focus();
    const text = `${title}\n${content}`;

    // 使用 execCommand 插入文本
    document.execCommand('insertText', false, text);

    // 上传文件
    if (images?.length > 0 || videos?.length > 0) {
      const fileInput = (await waitForElement('input[type="file"][accept*="image/*"]')) as HTMLInputElement;

      if (!fileInput) {
        throw new Error('未找到文件输入元素');
      }

      const dataTransfer = new DataTransfer();

      // 处理图片
      if (images) {
        for (const image of images) {
          try {
            const response = await fetch(image.url);
            const blob = await response.blob();
            const file = new File([blob], image.name, { type: image.type });
            dataTransfer.items.add(file);
          } catch (error) {
            console.error('获取图片失败:', error);
          }
        }
      }

      // 处理视频
      if (videos && videos.length > 0) {
        try {
          const video = videos[0];
          const response = await fetch(video.url);
          const blob = await response.blob();
          const file = new File([blob], video.name, { type: video.type });
          dataTransfer.items.add(file);
        } catch (error) {
          console.error('获取视频失败:', error);
        }
      }

      fileInput.files = dataTransfer.files;
      const changeEvent = new Event('change', { bubbles: true });
      fileInput.dispatchEvent(changeEvent);
    }

    // 等待上传完成
    await new Promise((resolve) => setTimeout(resolve, 5000));

    // 自动发布
    if (data.auto_publish) {
      const maxAttempts = 5;
      let attempt = 0;

      while (attempt < maxAttempts) {
        const postButton = document.querySelector(
          'div[aria-label="发帖"], div[aria-label="Post"], div[aria-label="發佈"]',
        ) as HTMLElement;

        if (postButton) {
          postButton.dispatchEvent(new Event('click', { bubbles: true }));
          console.log('已点击发布按钮');
          await new Promise((resolve) => setTimeout(resolve, 5000));
          window.location.reload();
          return;
        }

        await new Promise((resolve) => setTimeout(resolve, 1000));
        attempt++;
      }

      throw new Error('发布按钮点击失败：超过最大重试次数');
    }
  } catch (error) {
    console.error('FacebookDynamic 发布过程中出错:', error);
    throw error; // 向上传递错误
  }
}
