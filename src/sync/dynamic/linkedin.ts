import type { SyncData, DynamicData } from '../common';

export async function DynamicLinkedin(data: SyncData) {
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
        subtree: true
      });

      setTimeout(() => {
        observer.disconnect();
        reject(new Error(`元素未找到 "${selector}" 在 ${timeout}ms 内`));
      }, timeout);
    });
  }

  async function uploadFiles(files: File[]): Promise<void> {
    const editor = await waitForElement('div.ql-editor[contenteditable="true"]') as HTMLDivElement;
    if (!editor) {
      throw new Error('未找到编辑器元素');
    }

    const dataTransfer = new DataTransfer();
    for (let i = 0; i < Math.min(files.length, 8); i++) {
      dataTransfer.items.add(files[i]);
    }

    const pasteEvent = new ClipboardEvent('paste', {
      bubbles: true,
      cancelable: true,
      clipboardData: dataTransfer
    });
    editor.dispatchEvent(pasteEvent);
    console.debug('文件上传操作完成');
  }

  try {
    const { title, content, images } = data.data as DynamicData;

    // 点击发帖触发按钮
    const triggerButton = await waitForElement('button.share-box-feed-entry__trigger') as HTMLButtonElement;
    triggerButton.click();
    await new Promise(resolve => setTimeout(resolve, 1000));

    // 处理内容输入
    const editor = await waitForElement('div.ql-editor[contenteditable="true"]') as HTMLDivElement;
    editor.focus();
    editor.innerHTML = `${title || ''}\n${content}`;
    editor.dispatchEvent(new Event('input', { bubbles: true }));
    editor.dispatchEvent(new Event('change', { bubbles: true }));

    await new Promise(resolve => setTimeout(resolve, 2000));

    // 处理文件上传
    if (images && images.length > 0) {
      const files = await Promise.all(
        images.map(async fileData => {
          const response = await fetch(fileData.url);
          const blob = await response.arrayBuffer();
          return new File([blob], fileData.name, { type: fileData.type });
        })
      );
      await uploadFiles(files);
    }

    // 等待上传完成
    await new Promise(resolve => setTimeout(resolve, 5000));

    // 处理发布按钮
    const publishButton = document.querySelector('button.share-actions__primary-action') as HTMLButtonElement;
    if (publishButton && data.auto_publish) {
      console.debug('点击发布按钮');
      publishButton.click();
    }
  } catch (error) {
    console.error('LinkedIn 发布过程中出错:', error);
  }
}
