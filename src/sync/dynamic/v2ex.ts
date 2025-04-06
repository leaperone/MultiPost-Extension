import { type DynamicData, type SyncData } from '../common';

// 不支持发布视频
export async function DynamicV2EX(data: SyncData) {
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
    const { content, title } = data.data as DynamicData;

    // 等待标题输入框出现
    const titleInput = (await waitForElement('#topic_title')) as HTMLTextAreaElement;
    if (titleInput && title) {
      titleInput.value = title;
      titleInput.dispatchEvent(new Event('input', { bubbles: true }));
      console.log('标题已更新');
    }

    // 等待 CodeMirror 编辑器初始化完成
    await new Promise((resolve) => setTimeout(resolve, 1000));

    window.postMessage({
      type: 'V2EX_DYNAMIC_UPLOAD',
      content,
    });

    // 发布内容
    await new Promise((resolve) => setTimeout(resolve, 5000));
    const publishButton = document.querySelector('button[class="super normal button"]') as HTMLButtonElement;

    if (publishButton) {
      if (data.isAutoPublish) {
        console.log('点击发布按钮');
        publishButton.click();
      }
    } else {
      console.log('未找到发布按钮');
    }
  } catch (error) {
    console.error('V2EX发布过程中出错:', error);
  }
}
