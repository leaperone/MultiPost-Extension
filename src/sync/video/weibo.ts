import type { VideoData, SyncData } from '../common';

export async function VideoWeibo(data: SyncData) {
  const { content, video, title } = data.data as VideoData;

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
    // 处理视频上传
    if (video) {
      const response = await fetch(video.url);
      const blob = await response.blob();
      const videoFile = new File([blob], video.name, { type: video.type });
      console.log(`文件: ${videoFile.name} ${videoFile.type} ${videoFile.size}`);

      window.postMessage({ type: 'WEIBO_VIDEO_UPLOAD', video: videoFile }, '*');
    }

    console.log('成功填入微博内容和视频');

    await new Promise((resolve) => setTimeout(resolve, 1000));

    // 使用 findElementByText 函数查找输入元素
    const inputElement = (await waitForElement(
      'textarea[placeholder="有什么新鲜事想分享给大家？"]',
    )) as HTMLTextAreaElement;

    if (!inputElement) {
      throw new Error('未找到微博输入框');
    }

    // 组合标题和内容
    const fullContent = `${content}`;

    // 填写内容
    inputElement.value = fullContent;
    inputElement.dispatchEvent(new Event('input', { bubbles: true }));

    console.log('成功填入微博内容');

    const titleInputElement = (await waitForElement('input[placeholder="填写标题（0～30个字）"]')) as HTMLInputElement;

    if (!titleInputElement) {
      throw new Error('未找到微博标题输入框');
    }

    titleInputElement.value = title;
    titleInputElement.dispatchEvent(new Event('input', { bubbles: true }));

    console.log('成功填入微博标题');

    // 处理自动发布
    if (data.auto_publish) {
      const sendButtons = document.querySelectorAll('span.woo-button-content');
      const sendButton = Array.from(sendButtons).find((button) => button.textContent?.includes('发送'));

      if (sendButton) {
        console.log('点击发送按钮');
        (sendButton as HTMLElement).click();
        await new Promise((resolve) => setTimeout(resolve, 3000));
        window.location.reload();
      } else {
        console.log("未找到'发送'按钮");
      }
    }
  } catch (error) {
    console.error('填入微博内容或上传视频时出错:', error);
  }
}
