import { type VideoData, type SyncData } from '../common';

// 不支持发布视频
export async function VideoXiaoheihe(data: SyncData) {
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
    const { content, video, title } = data.data as VideoData;

    await new Promise((resolve) => setTimeout(resolve, 3000));
    const titleEditorSelector = 'div.hb-cpt__editor-title .ProseMirror.hb-editor';
    const contentEditorSelector = 'div.video__edit-content .ProseMirror.hb-editor';

    // 等待编辑器元素出现
    await waitForElement(contentEditorSelector);
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // 填写标题
    if (title) {
      try {
        await waitForElement(titleEditorSelector);
        const titleEditor = document.querySelector(titleEditorSelector);
        if (titleEditor) {
          (titleEditor as HTMLElement).focus();
          const titlePasteEvent = new ClipboardEvent('paste', {
            bubbles: true,
            cancelable: true,
            clipboardData: new DataTransfer(),
          });
          titlePasteEvent.clipboardData!.setData('text/plain', title);
          titleEditor.dispatchEvent(titlePasteEvent);
          await new Promise((resolve) => setTimeout(resolve, 500));
        }
      } catch {
        console.debug('未找到标题编辑器元素, 跳过标题填写');
      }
    }

    // 填写正文
    const contentEditor = document.querySelector(contentEditorSelector);
    if (!contentEditor) {
      console.debug('未找到正文编辑器元素');
      return;
    }

    (contentEditor as HTMLElement).focus();

    const contentPasteEvent = new ClipboardEvent('paste', {
      bubbles: true,
      cancelable: true,
      clipboardData: new DataTransfer(),
    });
    contentPasteEvent.clipboardData!.setData('text/plain', content || '');
    contentEditor.dispatchEvent(contentPasteEvent);

    if (video) {
      const response = await fetch(video.url);
      const blob = await response.blob();
      const videoFile = new File([blob], video.name, { type: video.type });
      console.log(`文件: ${videoFile.name} ${videoFile.type} ${videoFile.size}`);

      await new Promise((resolve) => setTimeout(resolve, 1000));

      window.postMessage({ type: 'XIAOHEIHE_VIDEO_UPLOAD', video: videoFile }, '*');
    }

    // 发布动态
    if (data.isAutoPublish) {
      const maxAttempts = 3;
      for (let attempt = 0; attempt < maxAttempts; attempt++) {
        const publishButton = document.querySelector<HTMLButtonElement>(
          'button.editor-publish__btn',
        ) as HTMLButtonElement;
        if (publishButton) {
          publishButton.click();
          console.log('已点击发布按钮');
          await new Promise((resolve) => setTimeout(resolve, 3000));
          window.location.reload();
          return;
        }
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }
  } catch (error) {
    console.error('小黑盒发布过程中出错:', error);
  }
}
