import type { VideoData, SyncData } from '../common';

export async function VideoWeibo(data: SyncData) {
  const { content, video, title, tags } = data.data as VideoData;

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

  function simulateDragAndDrop(dropTarget: Element, dataTransfer: DataTransfer) {
    const dragEnter = new DragEvent('dragenter', { bubbles: true, dataTransfer });
    const dragOver = new DragEvent('dragover', { bubbles: true, dataTransfer });
    const drop = new DragEvent('drop', { bubbles: true, dataTransfer });

    dropTarget.dispatchEvent(dragEnter);
    dropTarget.dispatchEvent(dragOver);
    dropTarget.dispatchEvent(drop);
  }

  try {
    // 等待文件上传按钮出现
    await waitForElement('input[type="file"]');

    // 处理视频上传
    if (video) {
      const response = await fetch(video.url);
      const arrayBuffer = await response.arrayBuffer();
      const videoFile = new File([arrayBuffer], video.name, { type: video.type });
      console.log(`文件: ${videoFile.name} ${videoFile.type} ${videoFile.size}`);

      // 查找上传视频按钮
      const buttons = document.querySelectorAll('button');
      const uploadVideoButton = Array.from(buttons).find((button) => button.textContent?.includes('上传视频'));

      if (!uploadVideoButton) {
        throw new Error('未找到"上传视频"按钮');
      }

      // 获取拖拽区域
      const dragArea = uploadVideoButton.parentElement?.parentElement;
      if (!dragArea) {
        throw new Error('未找到拖拽区域');
      }

      // 创建 DataTransfer 对象并模拟拖拽
      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(videoFile);
      simulateDragAndDrop(dragArea, dataTransfer);

      // 等待上传完成
      await new Promise((resolve) => setTimeout(resolve, 3000));
    }

    // 等待标题输入框出现
    await waitForElement('input[placeholder="填写标题（0～30个字）"]');

    // 等待验证码消失
    while (true) {
      const geetest = document.querySelector('div.geetest_captcha.geetest_boxShow.geetest_freeze_wait');
      if (!geetest) break;
      await new Promise((resolve) => setTimeout(resolve, 3000));
    }

    // 点击原创选项
    const radioTexts = document.querySelectorAll('span.woo-radio-text');
    const originalSpan = Array.from(radioTexts).find((span) => span.textContent === '原创');
    if (originalSpan) {
      (originalSpan as HTMLElement).click();
      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    // 填写标题
    const titleInput = document.querySelector('input[placeholder="填写标题（0～30个字）"]') as HTMLInputElement;
    if (titleInput) {
      titleInput.value = title;
      titleInput.dispatchEvent(new Event('input', { bubbles: true }));
    }

    // 填写内容
    const descriptionInput = document.querySelector(
      'textarea[placeholder="有什么新鲜事想分享给大家？"]',
    ) as HTMLTextAreaElement;
    if (descriptionInput) {
      const tagsText = tags ? tags.map((tag) => `#${tag}#`).join(' ') : '';
      const fullContent = `${content} ${tagsText}`;

      descriptionInput.focus();
      descriptionInput.value = fullContent;
      descriptionInput.dispatchEvent(new Event('input', { bubbles: true }));
      descriptionInput.dispatchEvent(new Event('change', { bubbles: true }));
    }

    // 处理自动发布
    if (data.isAutoPublish) {
      const buttons = document.querySelectorAll('button');
      const sendButton = Array.from(buttons).find(
        (button) => button.textContent?.includes('发布'),
      ) as HTMLButtonElement;

      if (sendButton) {
        let attempts = 0;
        while (sendButton.disabled && attempts < 10) {
          await new Promise((resolve) => setTimeout(resolve, 3000));
          attempts++;
          console.log(`等待发布按钮启用中... 尝试 ${attempts}/10`);
        }

        if (sendButton.disabled) {
          throw new Error('发布按钮在10次尝试后仍然禁用');
        }

        console.log('点击发布按钮');
        sendButton.dispatchEvent(new Event('click', { bubbles: true }));
        await new Promise((resolve) => setTimeout(resolve, 3000));
        window.location.reload();
      } else {
        console.log('未找到"发布"按钮');
      }
    }
  } catch (error) {
    console.error('填入微博内容或上传视频时出错:', error);
  }
}
