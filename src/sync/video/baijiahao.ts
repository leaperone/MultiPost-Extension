import { type SyncData, type VideoData } from '../common';

export async function VideoBaijiahao(data: SyncData) {
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
    const fileInput = (await waitForElement('input[type="file"]')) as HTMLInputElement;
    await new Promise((resolve) => setTimeout(resolve, 3000)); // 等待页面完全加载

    console.log('找到文件输入框:', fileInput);

    const dataTransfer = new DataTransfer();
    dataTransfer.items.add(file);
    fileInput.files = dataTransfer.files;

    // 触发必要的事件
    const changeEvent = new Event('change', { bubbles: true });
    fileInput.dispatchEvent(changeEvent);

    const inputEvent = new Event('input', { bubbles: true });
    fileInput.dispatchEvent(inputEvent);

    console.log('文件上传操作完成');
  }

  async function waitForUploadCompletion(timeout = 600000): Promise<void> {
    return new Promise((resolve, reject) => {
      const checkInterval = setInterval(() => {
        const spans = document.querySelectorAll('span');
        const uploadCompleteElement = Array.from(spans).find(
          (span) => span.textContent && span.textContent.includes('上传完成'),
        );
        if (uploadCompleteElement) {
          clearInterval(checkInterval);
          console.log('视频上传完成');
          resolve();
        }
      }, 1000);

      setTimeout(() => {
        clearInterval(checkInterval);
        reject(new Error('视频上传超时'));
      }, timeout);
    });
  }

  try {
    const { content, video, title } = data.data as VideoData;

    if (!video) {
      console.error('没有视频文件');
      return;
    }

    // 处理视频上传
    const response = await fetch(video.url);
    const arrayBuffer = await response.arrayBuffer();
    const videoFile = new File([arrayBuffer], `${title || 'video'}.${video.name.split('.').pop()}`, {
      type: video.type,
    });

    console.log(`准备上传视频: ${videoFile.name} (${videoFile.type}, ${videoFile.size} bytes)`);

    await uploadVideo(videoFile);
    await waitForUploadCompletion();

    // 等待页面状态稳定
    await new Promise((resolve) => setTimeout(resolve, 5000));

    // 处理描述输入
    const descriptionInput = (await waitForElement(
      'textarea[role="com-textarea"][placeholder="让别人更懂你"]',
    )) as HTMLTextAreaElement;

    if (descriptionInput) {
      const description = (content || title || '').slice(0, 100);
      descriptionInput.value = description;
      descriptionInput.dispatchEvent(new Event('input', { bubbles: true }));
      console.log('描述已输入:', description);
    }

    // 等待页面响应
    await new Promise((resolve) => setTimeout(resolve, 5000));

    // 如果需要自动发布
    if (data.isAutoPublish) {
      const publishButton = document.querySelector(
        'button.cheetah-btn.cheetah-btn-circle.cheetah-btn-primary.cheetah-btn-icon-only.cheetah-public',
      ) as HTMLButtonElement;

      if (publishButton) {
        console.log('点击发布按钮');
        publishButton.click();
      } else {
        console.log('未找到发布按钮');
      }
    }
  } catch (error) {
    console.error('百家号视频发布过程中出错:', error);
    throw error;
  }
}
