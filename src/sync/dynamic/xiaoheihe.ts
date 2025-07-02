import type { DynamicData, SyncData } from '../common';

export async function DynamicXiaoheihe(data: SyncData) {
  const { title, content, images } = data.data as DynamicData;
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

  try {
    const titleEditorSelector = 'div.hb-cpt__editor-title .ProseMirror.hb-editor';
    const contentEditorSelector = 'div.image-text__edit-content .ProseMirror.hb-editor';

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

    // 处理媒体上传（图片和视频）
    if (images.length > 0) {
      const imageData = [];
      for (const file of images) {
        const response = await fetch(file.url);
        const blob = await response.blob();
        const imageFile = new File([blob], file.name, { type: file.type });
        console.log(`文件: ${imageFile.name} ${imageFile.type} ${imageFile.size}`);
        imageData.push(imageFile);
      }
      await new Promise((resolve) => setTimeout(resolve, 1000));

      window.postMessage({ type: 'XIAOHEIHE_IMAGE_UPLOAD', images: imageData }, '*');
    }

    // 判断是否自动发布
    if (!data.isAutoPublish) return;

    // 等待一段时间确保文件上传完成
    await new Promise((resolve) => setTimeout(resolve, 3000));

    // 查找发布按钮
    const publishButton = document.querySelector<HTMLButtonElement>('button.editor-publish__btn');

    console.debug('sendButton', publishButton);

    if (publishButton) {
      // 如果找到发布按钮，检查是否可点击
      let attempts = 0;
      while (publishButton.disabled && attempts < 10) {
        await new Promise((resolve) => setTimeout(resolve, 3000));
        attempts++;
        console.debug(`Waiting for send button to be enabled. Attempt ${attempts}/10`);
      }

      if (publishButton.disabled) {
        console.debug('Send button is still disabled after 10 attempts');
        return;
      }

      console.debug('sendButton clicked');
      // 点击发布按钮
      const clickEvent = new Event('click', { bubbles: true });
      publishButton.dispatchEvent(clickEvent);
    } else {
      throw new Error('未找到发布按钮');
    }
  } catch (error) {
    console.error('小黑盒发布过程中出错:', error);
  }
}
